-- Local check of TreeDump v2 on core-only proofs:
-- `cat TreeDump.lean TestTreeDump.lean > /tmp/t.lean && lean /tmp/t.lean`
open Lean Meta Elab Command TreeDump
set_option Elab.async false

theorem toy (a b : Nat) (h : a ≤ b) : a ≤ b + 1 := Nat.le_succ_of_le h
theorem toy2 : (2 : Nat) ≤ 5 + 1 := toy 2 5 (by decide)
theorem toyB (h : Nat.ble 3 7 = true) : 3 ≤ 7 := Nat.le_of_ble_eq_true h
theorem toy3 : 3 ≤ 7 := toyB rfl
theorem toyI (n : Nat) (h : n = n) : True := trivial
theorem toy4 : True := toyI 5 rfl

run_meta do
  for n in [``toy2, ``toy3, ``toy4] do
    let ci ← getConstInfo n
    let j ← dumpTree (ci.value? (allowOpaque := true)).get!
    IO.println s!"{n}: {(j.getObjValD "kinds").compress}"
  -- coordinates: a literal, a closed sum, and a free variable
  let c1 ← coordOf (mkNatLit 123456789012345678901234567890)
  let c2 ← coordOf (mkApp2 (mkConst ``Nat.add) (mkNatLit 2) (mkNatLit 3))
  IO.println s!"{(toJson c1).compress} {(toJson c2).compress}"
