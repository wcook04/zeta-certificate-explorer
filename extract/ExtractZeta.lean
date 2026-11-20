/-
Driver, v2: assembled after one batch import and TreeDump (see .github/workflows/zeta-trees.yml),
run from the root of a built smmercuri/zeta checkout with `lake env lean`. One process per batch.

Environment:
  ZETA_BATCH       the batch theorem, e.g. Zeta.Certificates.RiemannSiegel.Batch0034.batch
  ZETA_METHOD      euler_maclaurin | riemann_siegel
  ZETA_DETAIL      comma-separated zero-based row offsets in this batch to dump in full (may be empty)
  ZETA_OUT         output folder (default `out`)

Reads only the compiled proof of the batch theorem (private olean data; this file is not a
`module`, so Lean loads the private level). It never rebuilds a certificate: a missing proof body
is reported as an error. The bundle's list of certificates is decoded by its structure
(`CertifiedZeroIntervals.ofCertifiedEM/RS pairs disj`, `List.cons`, `PSigma.mk I cert`), so each
certificate is bound to its list position and exact endpoints.

Writes `<batch>.summary.json` (every row: position, endpoints, variant, and the enclosures each
certificate field is about) and `<batch>.row<k>.tree.json` for each detailed offset.
-/
open Lean Meta Elab Command TreeDump

def envStr (k d : String) : IO String := return (← IO.getEnv k).getD d

/-- First subterm (preorder) whose head constant's name ends with one of `suffixes`. -/
partial def findHead (e : Expr) (suffixes : List String) : Option Expr :=
  let e := e.consumeMData
  match e.getAppFn with
  | .const c _ => if suffixes.any (c.toString.endsWith ·) then some e else descend e
  | _ => descend e
where
  descend (e : Expr) : Option Expr := match e with
    | .app f a => (findHead f suffixes).orElse fun _ => findHead a suffixes
    | .lam _ _ b _ => findHead b suffixes
    | .letE _ _ v b _ => (findHead v suffixes).orElse fun _ => findHead b suffixes
    | .mdata _ b => findHead b suffixes
    | _ => none

/-- Elements of a literal `List.cons … (List.cons … List.nil)`. -/
partial def listElems (e : Expr) (acc : Array Expr := #[]) : MetaM (Array Expr) := do
  let e := e.consumeMData
  if e.isAppOfArity ``List.cons 3 then listElems e.appArg! (acc.push e.appFn!.appArg!)
  else if e.isAppOfArity ``List.nil 1 then return acc
  else throwError "listElems: not a literal list at {acc.size}: {e.getAppFn}"

/-- `sfrac neg m d` → JSON with exact decimal strings. -/
def sfracJson (e : Expr) : Json :=
  let e := e.consumeMData
  let a := e.getAppArgs
  if (e.getAppFn.constName?.map (·.toString.endsWith "sfrac")).getD false && a.size == 3 then
    Json.mkObj [("neg", toJson (boolOf? a[0]!)), ("num", toJson ((litNat? a[1]!).map toString)),
      ("den", toJson ((litNat? a[2]!).map toString))]
  else Json.mkObj [("error", toJson "not an sfrac literal")]

def intervalJson (I : Expr) : Json :=
  let I := I.consumeMData
  let a := I.getAppArgs
  Json.mkObj [("ctor", toJson (I.getAppFn.constName?.map (·.toString))),
    ("left", if a.size > 0 then sfracJson a[0]! else Json.null),
    ("right", if a.size > 1 then sfracJson a[1]! else Json.null),
    ("nat_params", toJson ((a.extract 3 a.size).map fun x => (litNat? x).map toString))]

/-- Unwrap `Or.inl/Or.inr _ _ c` (Riemann–Siegel `Certified`) to the certificate and its variant. -/
def unwrapVariant (cert : Expr) : Expr × String :=
  let c := cert.consumeMData
  if c.isAppOfArity ``Or.inl 3 then (c.appArg!, "Certificate (with the C1 correction; tried second)")
  else if c.isAppOfArity ``Or.inr 3 then (c.appArg!, "Certificate0 (no C1 correction; tried first)")
  else (c, "Certificate (Euler-Maclaurin)")

def fieldSummary (mk : Expr) : MetaM Json := do
  let .const c us := mk.getAppFn | return Json.null
  let ci ← getConstInfo c
  let (_, parts) ← splitArgs (ci.instantiateTypeLevelParams us) mk.getAppArgs
  let mut fields := #[]
  for a in mk.getAppArgs, (p, nm, _) in parts do
    if p then
      let nears ← nearBelow a 10 [] #[]
      fields := fields.push (Json.mkObj [("field", toJson nm.toString), ("head", toJson (a.getAppFn.constName?.map (·.toString))),
        ("enclosures", toJson nears)])
  return toJson fields

run_meta do
  let batch := (← envStr "ZETA_BATCH" "").toName
  let method ← envStr "ZETA_METHOD" ""
  let detail := ((← envStr "ZETA_DETAIL" "").splitOn ",").filterMap String.toNat?
  let out : System.FilePath := ← envStr "ZETA_OUT" "out"
  IO.FS.createDirAll out
  let some ci := (← getEnv).find? batch | throwError "no declaration {batch}"
  let some v := ci.value? (allowOpaque := true)
    | throwError "{batch}: compiled proof body not visible from this import"
  let some bundle := findHead v ["ofCertifiedEM", "ofCertifiedRS"]
    | throwError "{batch}: no ofCertifiedEM/ofCertifiedRS application in the proof"
  let pairs ← listElems bundle.getAppArgs[0]!
  let t0 ← IO.monoMsNow
  let mut rows := #[]
  for pr in pairs, k in [0:pairs.size] do
    let a := pr.consumeMData.getAppArgs  -- PSigma.mk α β I cert
    let I := a[2]!
    let (mk, variant) := unwrapVariant a[3]!
    rows := rows.push (Json.mkObj [("offset", toJson k), ("interval", intervalJson I),
      ("variant", toJson variant), ("certificate_ctor", toJson (mk.getAppFn.constName?.map (·.toString))),
      ("fields", ← fieldSummary mk)])
    if detail.contains k then
      let s0 ← IO.monoMsNow
      let tree ← dumpTree mk
      let j := Json.mkObj [("schema", toJson "zeta-certificate-v2"), ("method", toJson method),
        ("batch_theorem", toJson batch.toString), ("offset", toJson k), ("source", toJson "compiled_batch"),
        ("interval", intervalJson I), ("variant", toJson variant),
        ("certificate_ctor", toJson (mk.getAppFn.constName?.map (·.toString))),
        ("extraction_ms", toJson ((← IO.monoMsNow) - s0)), ("tree", tree)]
      let f := out / s!"{batch}.row{k}.tree.json"
      IO.FS.writeFile f j.compress
      IO.println s!"  detail {f}: {(tree.getObjValD "node_count").compress} nodes, frontier {(tree.getObjValD "frontier").compress}"
  let summary := Json.mkObj [("schema", toJson "zeta-batch-summary-v2"), ("method", toJson method),
    ("batch_theorem", toJson batch.toString), ("rows", toJson rows.size),
    ("extraction_ms", toJson ((← IO.monoMsNow) - t0)), ("certificates", toJson rows)]
  IO.FS.writeFile (out / s!"{batch}.summary.json") summary.compress
  IO.println s!"{batch}: {rows.size} rows summarised"
