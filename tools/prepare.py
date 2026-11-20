"""Turn the extraction output into the explorer's data.

Input: an `extract` folder from the Actions workflow (`certificates/*.summary.json`,
`certificates/*.tree.json`, `profile/summary.json`, `provenance.txt`).
Output (in web/public/data/):
  catalogue.json   every certified interval, in height order, with exact endpoints, method,
                   certificate variant, and for each endpoint the enclosure of the approximant,
                   the enclosure of the error bound and the margin left over
  trees/<row>.json the computation behind each fully extracted certificate, simplified for
                   reading (see `simplify`)
  manifest.json    provenance and counts

Every number is computed here with exact rationals from the integers in the proof. Decimals are
rounded outward (an interval is widened, a margin rounded down), so a printed figure never claims
more than the proof shows. Nothing is computed in the browser.

Usage: prepare.py RUN_DIR OUT_DIR
"""
import json
import re
import sys
from collections import defaultdict
from decimal import ROUND_CEILING, ROUND_FLOOR, Decimal, getcontext
from fractions import Fraction
from pathlib import Path

getcontext().prec = 80


# ---------- exact numbers ----------

def frac_of_sfrac(s):
    v = Fraction(int(s["num"]), int(s["den"]))
    return -v if s.get("neg") else v


def encl(e):
    """(centre, radius) as Fractions, or None when a coordinate is unresolved."""
    try:
        c = Fraction(int(e["cn"]["value"]), int(e["cd"]["value"]))
        r = Fraction(int(e["rn"]["value"]), int(e["rd"]["value"]))
    except (TypeError, KeyError, ZeroDivisionError):
        return None
    return (-c if e["neg"] else c), r


def dec(x, digits, rounding):
    """Fraction -> decimal string with `digits` significant digits, rounded in one direction."""
    if x == 0:
        return "0"
    d = Decimal(x.numerator) / Decimal(x.denominator)
    exp = d.adjusted() - digits + 1
    q = Decimal(1).scaleb(exp)
    s = format(d.quantize(q, rounding=rounding), "f" if -12 < d.adjusted() < 15 else "e")
    if "." in s and "e" not in s:
        s = s.rstrip("0").rstrip(".")
    return s


def interval_text(c, r, digits=8):
    return [dec(c - r, digits, ROUND_FLOOR), dec(c + r, digits, ROUND_CEILING)]


def tval(s):
    """A height exactly as the proof writes it: num / 10^k printed with k decimals."""
    num, den = int(s["num"]), int(s["den"])
    k = len(str(den)) - 1
    assert den == 10 ** k, s
    text = f"{num // den}.{num % den:0{k}d}" if k else str(num)
    return ("-" if s.get("neg") else "") + text


# ---------- catalogue ----------

def batch_key(path):
    name = path.name
    m = 0 if "EulerMaclaurin" in name else 1
    n = int(re.search(r"Batch(\d+)", name).group(1))
    return (m, n)


def endpoint_check(field):
    """From a fst_error / snd_error field: the approximant's enclosure and the error bound's."""
    val = bound = None
    for e in field["enclosures"]:
        if e["path"] and e["path"][-1] == "hx":
            val = e
        elif e["path"] and e["path"][-1] == "he":
            bound = e
    return val, bound


def bound_height(subject):
    m = re.search(r"sfrac false (\d+) (\d+)\)", subject)
    return tval({"num": m.group(1), "den": m.group(2)}) if m else None


def catalogue(run):
    rows = []
    checks = {"margins": 0, "nonpositive": 0}
    for f in sorted((run / "certificates").glob("*.summary.json"), key=batch_key):
        s = json.loads(f.read_text())
        method = "EM" if s["method"] == "euler_maclaurin" else "RS"
        batch = re.search(r"Batch(\d+)", s["batch_theorem"]).group(1)
        for c in s["certificates"]:
            variant = "EM" if method == "EM" else ("C1" if c["variant"].startswith("Certificate (with") else "C0")
            fields = {fl["field"]: fl for fl in c["fields"]}
            ends = []
            for side in ("fst_error", "snd_error"):
                v, b = endpoint_check(fields[side])
                ve, be = encl(v["encl"]), encl(b["encl"])
                cz, rz = ve
                cb, rb = be
                margin = abs(cz) - rz - (cb + rb)
                checks["margins"] += 1
                if margin <= 0:
                    checks["nonpositive"] += 1
                ends.append({
                    "z": interval_text(cz, rz), "sign": "+" if cz > 0 else "-",
                    "bound": dec(cb + rb, 8, ROUND_CEILING), "boundAt": bound_height(b["subject"]),
                    "margin": dec(margin, 6, ROUND_FLOOR),
                })
            rows.append({
                "method": method, "batch": int(batch), "offset": c["offset"], "variant": variant,
                "left": tval(c["interval"]["left"]), "right": tval(c["interval"]["right"]),
                "params": c["interval"]["nat_params"], "ends": ends,
            })
    for i, r in enumerate(rows, 1):
        r["row"] = i
    return rows, checks


# ---------- trees ----------

PASS = {"Enclosure.Real.IsNear.of_eq", "Enclosure.Real.IsNear.recentre'", "Enclosure.Complex.IsNear.of_eq"}


def pretty(s):
    s = re.sub(r"Enclosure\.sfrac (false|true) (\d+) (\d+)",
               lambda m: ("-" if m.group(1) == "true" else "") + dec(Fraction(int(m.group(2)), int(m.group(3))), 10, ROUND_FLOOR), s)
    for a, b in [("Zeta.Certificates.", ""), ("Zeta.RiemannSiegel.", ""), ("Complex.Stirling.", ""), ("BSN.", ""),
                 ("Real.pi", "π"), ("Real.", ""), ("Complex.I", "i"), ("↑", ""), ("Finset.range", "range")]:
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


ROLE_RULES = [
    (r"^\(mkZI(RS)? .*\)\.fstVal", "Z̃ at the left end"),
    (r"^\(mkZI(RS)? .*\)\.sndVal", "Z̃ at the right end"),
    (r"^hardyZApproximantRS₀ ", "Z̃(t), Riemann–Siegel without C₁"),
    (r"^hardyZApproximantRS ", "Z̃(t), Riemann–Siegel with C₁"),
    (r"^hardyZApproximantEM ", "Z̃(t), Euler–Maclaurin"),
    (r"^hardyZErrorBoundRS₀", "error bound, without C₁"),
    (r"^hardyZErrorBoundRS", "error bound, with C₁"),
    (r"^hardyZErrorBound", "error bound"),
    (r"^mainSumOfPhase", "main sum"),
    (r"^mainSumRS .* (\d+)$", "main sum, terms 1 to {1}"),
    (r"^riemannSiegelThetaApproximant", "θ̃(t)"),
    (r"^riemannSiegelThetaStirlingErrorBound", "error in θ̃"),
    (r"^\(zetaApproximant .*\)\.re", "Re ζ̃"),
    (r"^\(zetaApproximant .*\)\.im", "Im ζ̃"),
    (r"^‖zetaApproximant", "|ζ̃|"),
    (r"^zetaApproximant", "ζ̃, the Euler–Maclaurin sum"),
    (r"^logGammaStirling", "log Γ by Stirling"),
    (r"^π$", "π"),
    (r"^log \(([-\d.]+)\)$", "log {1}"),
    (r"^log \(([-\d.]+) / ([-\d.]+)\)$", "log({1}/{2})"),
]


def strip_parens(p):
    p = p.strip()
    while p.startswith("(") and p.endswith(")"):
        depth = 0
        for i, ch in enumerate(p):
            depth += ch == "("
            depth -= ch == ")"
            if depth == 0 and i < len(p) - 1:
                return p
        p = p[1:-1].strip()
    return p


def top_split(p):
    """The lowest-precedence binary operator outside all brackets: (left, symbol, right) or None."""
    for ops in ((" + ", " - "), (" * ", " / ")):
        depth, found = 0, None
        i = 0
        while i < len(p):
            ch = p[i]
            if ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
            elif depth == 0:
                for op in ops:
                    if p.startswith(op, i) and i > 0:
                        found = (i, op)
            i += 1
        if found:
            i, op = found
            return p[:i], {" * ": "×", " / ": "/", " + ": "+", " - ": "−"}[op], p[i + len(op):]
    return None


def is_theta(p):
    return "logGammaStirling" in p or "riemannSiegelTheta" in p


def name(p, depth=0):
    p = strip_parens(p)
    sp = top_split(p) if depth < 2 else None
    if sp:
        l, sym, r = sp
        prec = 1 if sym in "+−" else 2

        def operand(x, right):
            s = name(x, depth + 1)
            inner = top_split(strip_parens(x)) if depth + 1 < 2 else None
            ip = 3 if not inner else (1 if inner[1] in "+−" else 2)
            if not inner and not s.startswith("(") and re.search(r" [-+*/] ", s):
                ip = 1  # an unsplit tail that still holds an operator
            if ip < prec or (right and ip == prec and sym in "−/"):
                return f"({s})"
            return s

        return f"{operand(l, False)} {sym} {operand(r, True)}"
    if p.startswith("cos ") or p.startswith("sin "):
        return f"{p[:3]} θ̃" if is_theta(p) else f"{p[:3]}(…)"
    for pat, nm in ROLE_RULES:
        m = re.search(pat, p)
        if m:
            return nm.format(*([m.group(0)] + list(m.groups())))
    return p if len(p) <= 34 else p[:32] + "…"


SUPER = {"1": "′", "2": "″", "3": "‴"}


def mathify(p, heights):
    for h in sorted(heights, key=len, reverse=True):
        short = h.rstrip("0").rstrip(".") if "." in h else h
        p = re.sub(rf"(?<![\d.]){re.escape(short)}(?![\d])", "t", p)
    p = p.replace("2 * π", "2π").replace("π * π", "π²")
    p = re.sub(r"\(t / \(2π\)\)", "(t/2π)", p).replace("t / (2π)", "t/2π")
    p = re.sub(r"√√\(t/2π\)", "(t/2π)^¼", p)
    p = re.sub(r"iteratedDeriv (\d) (?:Zeta\.RiemannSiegel\.)?correction", lambda m: "Ψ" + SUPER.get(m.group(1), f"^({m.group(1)})"), p)
    p = re.sub(r"\bcorrection\b", "Ψ", p)
    p = re.sub(r"\(?Enclosure\.sfrac (?:false|true) ⋯ ⋯\)?", "⋯", p).replace("Enclosure.sfrac", "")
    p = p.replace("(-1) ^ 4", "(−1)⁴").replace(" ^ (-(1 / 4))", "^(−¼)")
    return p


HEIGHTS = []


def role(subject):
    n = name(mathify(pretty(subject), HEIGHTS))
    return n if len(n) <= 64 else n[:62] + "…"


FIELD_LABELS = {
    "is_sign_change": "Z̃ changes sign across the interval",
    "fst_error": "At the left end, |Z̃| is larger than the error bound",
    "snd_error": "At the right end, |Z̃| is larger than the error bound",
    "le_fst": "t is at least 32π, where the error bound holds",
    "fst_nonneg": "The left end is not negative",
    "fstBernoulli_pos": "Bernoulli order at the left end is positive",
    "sndBernoulli_pos": "Bernoulli order at the right end is positive",
    "fstCutoff_pos": "Cutoff at the left end is positive",
    "sndCutoff_pos": "Cutoff at the right end is positive",
}


SIDE_FIELDS = {"le_fst", "fst_nonneg", "fstBernoulli_pos", "sndBernoulli_pos", "fstCutoff_pos", "sndCutoff_pos"}


def simplify(tree):
    """Contract the proof DAG onto the quantities it encloses.

    Kept ("cards"): the certificate, its fields, and every node that proves an enclosure
    |x − c| ≤ r. A kept node whose only kept input encloses the same quantity (a renaming,
    a re-centring, a sealed lemma's body) is merged into it, so a chain of steps about one value
    is one card with its chain listed. Between cards, lemma steps without an enclosure are listed
    on the card above as `steps`; refl leaves are listed as `checks` (Boolean checks the kernel
    reduces, identities, conversions)."""
    nodes = {n["id"]: n for n in tree["nodes"]}
    root = tree["root"]
    fields = set(nodes[root]["children"])
    leaf_kinds = {"boolean_check", "identity", "conversion", "decide"}

    def is_card(n):
        return n["id"] == root or n["id"] in fields or n.get("re") is not None

    region = {}  # card id -> (uses, steps, checks)

    def scan(cid):
        uses, steps, checks = [], [], []
        seen = set()
        stack = list(reversed(list(zip(nodes[cid]["children"], nodes[cid]["labels"]))))
        while stack:
            k, lab = stack.pop()
            if k in seen:
                continue
            seen.add(k)
            n = nodes[k]
            if n["kind"] in leaf_kinds:
                checks.append(k)
            elif is_card(n):
                uses.append(k)
            else:
                steps.append(k)
                stack.extend(reversed(list(zip(n["children"], n["labels"]))))
        return uses, steps, checks

    cards = {root}
    frontier = [root]
    while frontier:
        c = frontier.pop()
        u, s, ch = scan(c)
        region[c] = (u, s, ch)
        for k in u:
            if k not in cards:
                cards.add(k)
                frontier.append(k)

    # merge chains about one quantity
    alias = {}

    def rep(i):
        while i in alias:
            i = alias[i]
        return i

    indeg = defaultdict(int)
    for c in cards:
        for k in set(region[c][0]):
            indeg[k] += 1
    for c in sorted(cards):
        u = region[c][0]
        n = nodes[c]
        while len(set(u)) == 1:
            k = u[0]
            kn = nodes[k]
            same = n.get("subject") and kn.get("subject") and (
                kn["head"] in PASS or n["head"] in PASS or kn["kind"] == "aux" or kn["subject"] == n["subject"])
            if not same or indeg[k] > 1 or k == root:
                break
            alias[k] = c
            ku, ks, kc = region[k]
            us, ss, cs = region[c]
            region[c] = (ku, ss + [k] + ks, cs + kc)
            u = ku

    out = {}
    for c in cards:
        if c in alias:
            continue
        n = nodes[c]
        u, s, ch = region[c]
        uses = []
        for k in u:
            r = rep(k)
            if r not in uses and r != c:
                uses.append(r)
        e = None
        if n.get("re"):
            ce = encl(n["re"])
            if ce:
                e = {"lo": interval_text(*ce, 12)[0], "hi": interval_text(*ce, 12)[1],
                     "centre": dec(ce[0], 12, ROUND_FLOOR) if ce[0] >= 0 else dec(ce[0], 12, ROUND_CEILING),
                     "radius": dec(ce[1], 3, ROUND_CEILING)}
        if c == root:
            label = "The certificate for this interval"
        elif c in fields:
            f = nodes[root]["labels"][nodes[root]["children"].index(c)]
            label = FIELD_LABELS.get(f, f)
        else:
            label = role(n.get("subject") or n["statement"])
        chk = defaultdict(int)
        for k in ch:
            kn = nodes[k]
            chk[(kn["kind"], kn.get("obligationHead") or "")] += 1
        out[c] = {
            "id": str(c), "label": label, "head": n["head"], "kind": n["kind"],
            "subject": pretty(n["subject"]) if n.get("subject") else None,
            "statement": pretty(n["statement"]), "value": e,
            "steps": [{"head": nodes[k]["head"], "kind": nodes[k]["kind"], "statement": pretty(nodes[k]["statement"])}
                      for k in s][:40],
            "stepCount": len(s),
            "checks": [{"kind": k, "head": h, "count": v} for (k, h), v in sorted(chk.items(), key=lambda x: -x[1])],
            "checkExamples": [pretty(nodes[k]["statement"]) for k in ch if nodes[k]["kind"] == "boolean_check"][:3],
            "uses": [str(x) for x in uses],
        }
    # Group the side conditions under one card for display; the proof keeps them as separate fields.
    out = {str(k): v for k, v in out.items()}
    side = list(dict.fromkeys(str(c) for c, l in zip(nodes[root]["children"], nodes[root]["labels"])
                              if l in SIDE_FIELDS and str(c) in out))
    side_labels = [FIELD_LABELS.get(l, l) for c, l in zip(nodes[root]["children"], nodes[root]["labels"]) if l in SIDE_FIELDS]
    main = [u for u in out[str(root)]["uses"] if u not in side]
    order = {"is_sign_change": 0, "fst_error": 1, "snd_error": 2}
    lab = {str(c): l for c, l in zip(nodes[root]["children"], nodes[root]["labels"])}
    main.sort(key=lambda u: order.get(lab.get(u, ""), 9))
    if len(side) > 1:
        merged = defaultdict(int)
        for s in side:
            for ch in out[s]["checks"]:
                merged[(ch["kind"], ch["head"])] += ch["count"]
        out["side"] = {
            "id": "side", "label": f"Side conditions ({len(side_labels)}), grouped for display", "head": "", "kind": "group",
            "subject": None, "statement": "; ".join(side_labels), "value": None,
            "steps": [{"head": "", "kind": "field", "statement": l} for l in side_labels],
            "stepCount": 0,
            "checks": [{"kind": k, "head": h, "count": v} for (k, h), v in sorted(merged.items(), key=lambda x: -x[1])],
            "checkExamples": [], "uses": [u for s in side for u in out[s]["uses"]],
        }
        for s in side:
            del out[s]
        main.append("side")
    else:
        main += side
    out[str(root)]["uses"] = main
    return {"root": str(root), "nodes": list(out.values()), "rawNodes": len(nodes)}


def main():
    run, out = Path(sys.argv[1]), Path(sys.argv[2])
    (out / "trees").mkdir(parents=True, exist_ok=True)
    rows, checks = catalogue(run)
    assert len(rows) == 10156, len(rows)
    assert checks["nonpositive"] == 0, checks
    index = {(r["method"], r["batch"], r["offset"]): r for r in rows}
    details = []
    for f in sorted((run / "certificates").glob("*.tree.json")):
        t = json.loads(f.read_text())
        method = "EM" if t["method"] == "euler_maclaurin" else "RS"
        batch = int(re.search(r"Batch(\d+)", t["batch_theorem"]).group(1))
        r = index[(method, batch, t["offset"])]
        assert tval(t["interval"]["left"]) == r["left"], (f, r["left"])
        HEIGHTS[:] = [r["left"], r["right"]] + [e["boundAt"] for e in r["ends"] if e["boundAt"]]
        g = simplify(t["tree"])
        g.update(row=r["row"], method=method, variant=r["variant"], left=r["left"], right=r["right"],
                 batch=t["batch_theorem"], offset=t["offset"], frontier=t["tree"]["frontier"])
        (out / "trees" / f"{r['row']}.json").write_text(json.dumps(g, ensure_ascii=False, separators=(",", ":")))
        r["detail"] = True
        details.append((r["row"], len(g["nodes"]), g["rawNodes"]))
    (out / "catalogue.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")))
    prov = dict(l.split(" ", 1) for l in (run / "provenance.txt").read_text().splitlines() if " " in l)
    manifest = {"rows": len(rows), "detailed": sorted(d[0] for d in details),
                "variants": {v: sum(1 for r in rows if r["variant"] == v) for v in ("EM", "C0", "C1")},
                "margins_checked": checks["margins"], "provenance": prov}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(json.dumps(manifest["variants"]), "details (row, cards, proof nodes):", details)


if __name__ == "__main__":
    main()
