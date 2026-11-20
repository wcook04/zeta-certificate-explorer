/-
Proof-tree dump for kernel-checked numerical certificates (core Lean only; no Mathlib). v2.

`dumpTree e` walks a proof term and records one node per constant-headed application: the
constant, its declaration kind, the statement it proves there (its type instantiated at its
arguments), and the child proofs, each child labelled by the hypothesis it fills and keyed by the
statement the parent requires at that position. Value arguments are not children; they appear
inside statements.

Leaf kinds (refl-style proofs, where no lemma is applied):
* `identity`: the required statement is `a = a` with identical sides; nothing is computed;
* `boolean_check`: the required statement is `f … = true` (or `false`); the kernel must reduce
  `f …` (for example `Nat.ble a b`, `Enclosure.mulLitOk …`) to the constructor;
* `conversion`: any other refl, accepted by definitional unfolding;
* `decide`: `of_decide_eq_true`.
`obligationHead` names the head constant of what must reduce. It is the statement's syntax, not a
record of execution.

Enclosures: when the statement is `Real.IsNear x neg cn cd rn rd` (|x − ±cn/cd| ≤ rn/rd), or
`Complex.IsNear`, the coordinates are given as decimal strings (never JSON numbers, which lose
precision beyond 2^53). A coordinate that is a closed `Nat` expression rather than a literal is
normalised by `Meta.evalNat`; `status` says `literal`, `normalized` or `unresolved`.

Generated declarations (`mkAuxLemma`, `_proof_N`) are `aux` nodes; their bodies are walked once.
Shared subproofs appear once, so the output is a DAG. `maxNodes` is checked before allocation and
every node not fully expanded because of the cap is listed in `frontier`.
-/
import Lean
open Lean Meta

namespace TreeDump

structure Coord where
  value : Option String
  status : String
  deriving ToJson

structure Encl where
  neg : Option Bool
  cn : Coord
  cd : Coord
  rn : Coord
  rd : Coord
  deriving ToJson

structure Node where
  id : Nat
  head : String
  declKind : String := ""
  kind : String
  statement : String
  subject : Option String := none
  re : Option Encl := none
  im : Option Encl := none
  nargs : Nat := 0
  children : Array Nat := #[]
  /-- The binder name each child fills. -/
  labels : Array String := #[]
  /-- For leaves: the head of what must reduce (syntax, not an execution record). -/
  obligationHead : Option String := none
  deriving ToJson

structure St where
  nodes : Array Node := #[]
  seen : Std.HashMap Expr Nat := {}
  frontier : Array Nat := #[]

structure Cfg where
  maxNodes : Nat := 60000
  stmtChars : Nat := 400

abbrev M := ReaderT Cfg (StateRefT St MetaM)

def litNat? (e : Expr) : Option Nat :=
  match e.consumeMData with
  | .lit (.natVal n) => some n
  | e => match e.nat? with
    | some n => some n
    | none => e.rawNatLit?

def coordOf (e : Expr) : MetaM Coord := do
  if let some n := litNat? e then return { value := some (toString n), status := "literal" }
  match ← (try Meta.evalNat e catch _ => pure none) with
  | some n => return { value := some (toString n), status := "normalized" }
  | none => return { value := none, status := "unresolved" }

def boolOf? (e : Expr) : Option Bool :=
  if e.isConstOf ``Bool.true then some true
  else if e.isConstOf ``Bool.false then some false else none

def enclOf (neg cn cd rn rd : Expr) : MetaM Encl :=
  return { neg := boolOf? neg, cn := ← coordOf cn, cd := ← coordOf cd, rn := ← coordOf rn, rd := ← coordOf rd }

def endsWith (n : Name) (s : String) : Bool := n.toString.endsWith s

def declKindOf (ci : ConstantInfo) : String :=
  match ci with
  | .thmInfo _ => "theorem" | .defnInfo _ => "def" | .axiomInfo _ => "axiom"
  | .opaqueInfo _ => "opaque" | .ctorInfo _ => "constructor" | .recInfo _ => "recursor"
  | .inductInfo _ => "inductive" | .quotInfo _ => "quot"

/-- Generated declarations: `mkAuxLemma` lemmas and `_proof_N` abstractions. -/
def isAux (n : Name) : Bool :=
  (n.toString.splitOn "_auxLemma").length > 1 || (n.toString.splitOn "._proof_").length > 1 || n.isInternal

def reflLike (n : Name) : Bool :=
  n == ``Eq.refl || n == ``rfl || n == ``HEq.refl || endsWith n "reflBoolTrue" || n == ``of_decide_eq_true

def pp (e : Expr) (k : Nat) : MetaM String := do
  let s ← try
      withOptions (fun o => o |>.setBool `pp.proofs false |>.setBool `pp.deepTerms false
          |>.set `pp.deepTerms.threshold (8 : Nat)) do
        return toString (← ppExpr e)
    catch _ => pure "(could not print)"
  let s := s.replace "\n" " "
  return if s.length > k then (s.take k).toString ++ " …" else s

/-- Classify a refl-style leaf by the statement its parent requires. -/
def leafKind (c : Name) (req : Expr) : String × Option String :=
  if c == ``of_decide_eq_true then ("decide", req.getAppFn.constName?.map (·.toString)) else
  let a := req.getAppArgs
  if req.isAppOf ``Eq && a.size == 3 then
    let lhs := a[1]!
    let rhs := a[2]!
    let h := lhs.getAppFn.constName?.map (·.toString)
    if lhs == rhs then ("identity", h)
    else if (boolOf? rhs).isSome then ("boolean_check", h)
    else ("conversion", h)
  else ("conversion", req.getAppFn.constName?.map (·.toString))

/-- Instantiate `ty` at `args`; for each argument, whether it is a proof, its binder name and the
required type at that position. -/
def splitArgs (ty : Expr) (args : Array Expr) : MetaM (Expr × Array (Bool × Name × Expr)) := do
  let mut t := ty
  let mut out := #[]
  for a in args do
    match ← whnfR t with
    | .forallE nm d b _ =>
      out := out.push ((← (try isProp d catch _ => pure false)), nm, d)
      t := b.instantiate1 a
    | _ => out := out.push (false, .anonymous, mkConst ``True)
  return (t, out)

def isNearFields (concl : Expr) : MetaM (Option (Expr × Encl × Option Encl)) := do
  let some h := concl.getAppFn.constName? | return none
  let ca := concl.getAppArgs
  if endsWith h "Real.IsNear" && ca.size == 6 then
    return some (ca[0]!, ← enclOf ca[1]! ca[2]! ca[3]! ca[4]! ca[5]!, none)
  if endsWith h "Complex.IsNear" && ca.size == 11 then
    return some (ca[0]!, ← enclOf ca[1]! ca[2]! ca[3]! ca[4]! ca[5]!,
                 some (← enclOf ca[6]! ca[7]! ca[8]! ca[9]! ca[10]!))
  return none

partial def walk (e : Expr) (required : Option Expr := none) : M Nat := do
  let e := e.consumeMData
  let leaf := match e.getAppFn with | .const c _ => reflLike c | _ => false
  let key := match required, leaf with
    | some t, true => mkApp2 (mkConst `TreeDump.leafKey) e t
    | _, _ => e
  if let some i := (← get).seen[key]? then return i
  let cfg ← read
  let id := (← get).nodes.size
  modify fun s => { s with seen := s.seen.insert key id,
                           nodes := s.nodes.push { id, head := "", kind := "pending", statement := "" } }
  let fn := e.getAppFn
  let args := e.getAppArgs
  let mut node : Node := { id, head := "", kind := "other", statement := "" }
  match fn with
  | .const c us =>
    let ci ← getConstInfo c
    let (concl, parts) ← splitArgs (ci.instantiateTypeLevelParams us) args
    let concl ← instantiateMVars concl
    node := { node with head := c.toString, declKind := declKindOf ci, nargs := args.size }
    if leaf then
      let req := required.getD concl
      let (k, h) := leafKind c req
      node := { node with kind := k, obligationHead := h, statement := ← pp req cfg.stmtChars }
    else
      node := { node with kind := if isAux c then "aux" else "lemma", statement := ← pp concl cfg.stmtChars }
      if let some (x, re, im?) ← isNearFields concl then
        node := { node with subject := some (← pp x 200), re := some re, im := im? }
      let mut kids := #[]
      let mut labels := #[]
      let mut capped := false
      if node.kind == "aux" then
        if let some v := ci.value? (allowOpaque := true) then
          let v := (v.instantiateLevelParams ci.levelParams us).beta args
          if (← get).nodes.size < cfg.maxNodes then
            kids := kids.push (← walk v)
            labels := labels.push "body"
          else capped := true
        else
          node := { node with kind := "aux-body-unavailable" }
      else
        for a in args, (p, nm, d) in parts do
          if p then
            if (← get).nodes.size < cfg.maxNodes then
              kids := kids.push (← walk a (some (← instantiateMVars d)))
              labels := labels.push nm.toString
            else capped := true
      node := { node with children := kids, labels }
      if capped then modify fun s => { s with frontier := s.frontier.push id }
  | _ =>
    node := { node with head := s!"({fn.ctorName})", kind := "unsupported",
                        statement := ← pp (← inferType e) cfg.stmtChars }
    modify fun s => { s with frontier := s.frontier.push id }
  modify fun s => { s with nodes := s.nodes.set! id node }
  return id

def kindCounts (ns : Array Node) : Json :=
  let m := ns.foldl (fun (m : Std.HashMap String Nat) n => m.insert n.kind (m.getD n.kind 0 + 1)) {}
  Json.mkObj (m.toList.map fun (k, v) => (k, toJson v))

def dumpTree (e : Expr) (cfg : Cfg := {}) : MetaM Json := do
  let (root, st) ← (walk e |>.run cfg).run {}
  return Json.mkObj [("schema", toJson "zeta-tree-v2"), ("root", toJson root),
    ("node_count", toJson st.nodes.size), ("kinds", kindCounts st.nodes),
    ("frontier", toJson st.frontier), ("nodes", toJson st.nodes)]

/-- The `IsNear` enclosures reachable from `e` through at most `depth` proof steps without
passing through another enclosure: the values a certificate field's check is about. -/
partial def nearBelow (e : Expr) (depth : Nat) (path : List String) (acc : Array Json) :
    MetaM (Array Json) := do
  let e := e.consumeMData
  let .const c us := e.getAppFn | return acc
  if reflLike c then return acc
  let ci ← getConstInfo c
  let args := e.getAppArgs
  let (concl, parts) ← splitArgs (ci.instantiateTypeLevelParams us) args
  if let some (x, re, _) ← isNearFields (← instantiateMVars concl) then
    return acc.push (Json.mkObj [("path", toJson path.reverse), ("via", toJson c.toString),
      ("subject", toJson (← pp x 200)), ("encl", toJson re)])
  if depth == 0 then return acc
  let mut acc := acc
  for a in args, (p, nm, _) in parts do
    if p then acc ← nearBelow a (depth - 1) (nm.toString :: path) acc
  return acc

end TreeDump
