// What the certificate metaprogram does to keep the kernel's work small, in the terms of the source
// at the commit this page was built from. Each technique sits beside its count in the open
// certificate and one real occurrence, which the reader can open in the proof graph.

import type { CertCard, CertTree, Manifest } from "./types";

const SRC = "https://github.com/smmercuri/zeta/blob/34037d5a7662e2eb6e970bfb22299c84e45ed5d9";
const fmt = (n: number) => n.toLocaleString("en-GB");

/** Long numerals in a kernel check, shortened for reading: 7402187635769028378624 → 74021…78624 (22 digits). */
export function shortLiterals(s: string): string {
  return s.replace(/\d{13,}/g, (d) => `${d.slice(0, 5)}…${d.slice(-5)} (${d.length} digits)`);
}

function Src({ path, line, children }: { path: string; line: number; children: React.ReactNode }) {
  return <a href={`${SRC}/${path}#L${line}`}><code>{children}</code></a>;
}

/** One real occurrence of each technique in this certificate's proof. */
export function techniqueExamples(tree: CertTree) {
  const ns = tree.nodes;
  const enclosure = ns.find((n) => n.value && n.label === "Z̃ at the left end") ?? ns.find((n) => n.value);
  const checks = (n: CertCard) => n.checks.reduce((k, c) => k + c.count, 0);
  const boolean = [...ns].filter((n) => n.checkExamples.length > 0).sort((a, b) => b.kernelLiteralDigits - a.kernelLiteralDigits || checks(b) - checks(a))[0];
  const recentre = [...ns].filter((n) => n.recentred).sort((a, b) => (b.recentred![0] - b.recentred![1]) - (a.recentred![0] - a.recentred![1]))[0];
  const sealed = [...ns].filter((n) => n.sealed).sort((a, b) => b.citedBy - a.citedBy)[0];
  return { enclosure, boolean, recentre, sealed };
}

function Example({ card, onShow, children }: { card?: CertCard; onShow(id: string): void; children: React.ReactNode }) {
  if (!card) return null;
  return (
    <div className="zx-tech-ex">
      <p>{children}</p>
      <button type="button" onClick={() => onShow(card.id)}>Show it in the graph</button>
    </div>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return <p className="zx-tech-n"><b>{fmt(n)}</b> {label}</p>;
}

export function Metaprogram({ tree, onShow }: { tree: CertTree; onShow(id: string): void }) {
  const s = tree.stats;
  const ex = techniqueExamples(tree);
  const quantities = tree.nodes.filter((n) => n.value).length;
  const top = s.kernelCheckHeads.slice(0, 3);
  const rest = s.kernelChecks - top.reduce((k, [, n]) => k + n, 0);
  return (
    <ol className="zx-tech">
      <li>
        <Count n={quantities} label="numbers with a proved interval" />
        <h4>Each real number is given by four natural numbers</h4>
        <p>
          Each number x in the computation comes with four natural numbers cn, cd, rn and rd and a proof that |x − (±cn/cd)| ≤ rn/rd
          (<Src path="Enclosure/Core.lean" line={23}>Real.IsNear</Src>). Sums and products are computed on these four natural numbers by
          interval arithmetic. An equation between two expressions is used only to move such a bound from one expression to the other
          (<Src path="Zeta/Certificate/Named.lean" line={26}>Named.lean</Src>).
        </p>
        <Example card={ex.enclosure} onShow={onShow}>
          {ex.enclosure && <>{ex.enclosure.label} lies in <span className="zx-nums">[{ex.enclosure.value!.lo}, {ex.enclosure.value!.hi}]</span></>}
        </Example>
      </li>
      <li>
        <Count n={s.kernelChecks} label="integer comparisons" />
        <h4>Every condition is a comparison of natural numbers</h4>
        <p>
          The conditions each lemma needs, such as one natural number being at most another, are written with <code>Nat.ble</code>,{" "}
          <code>Nat.beq</code>, <code>Nat.mul</code> and other functions on natural numbers and proved by <code>rfl</code>. The kernel checks
          them with its built-in arithmetic on natural numbers and never has to unfold the definition of a real number.{" "}
          <Src path="Enclosure/Defs.lean" line={31}>recentreOk</Src> puts the six conditions of one re-centring (next column) into a single
          check.
        </p>
        <p className="zx-tech-split">
          Of these, {top.map(([h, n], i) => <span key={h}>{i ? ", " : ""}{fmt(n)} use <code>{h}</code></span>)}{rest > 0 ? <> and {fmt(rest)} use other functions</> : null}.
        </p>
        <Example card={ex.boolean} onShow={onShow}>
          {ex.boolean && <>The comparison with the largest integers in this proof: <code>{shortLiterals(ex.boolean.checkExamples[0])}</code></>}
        </Example>
      </li>
      <li>
        <Count n={s.recentrings} label="re-centrings" />
        <h4>The integers are kept short</h4>
        <p>
          Multiplying fractions makes their numerators and denominators longer. When the denominator cd passes a size limit,{" "}
          <Src path="Enclosure/BinarySplit/Tactic/Enclosures.lean" line={119}>renorm</Src> rounds the centre cn/cd to a nearby fraction whose
          denominator is a power of two and adds the rounding error to the radius rn/rd, which is proved by{" "}
          <Src path="Enclosure/Arith.lean" line={546}>recentre'</Src>. This proof does that {fmt(s.recentrings)} times, and{" "}
          {fmt(s.recentringsShortened)} of those make the four integers shorter.
        </p>
        <Example card={ex.recentre} onShow={onShow}>
          {ex.recentre && <>The biggest reduction is in {ex.recentre.label}, where the four integers go from <b>{ex.recentre.recentred![0]}</b> digits in total to <b>{ex.recentre.recentred![1]}</b></>}
        </Example>
      </li>
      <li>
        <Count n={s.sealedLemmas} label="separate lemmas" />
        <h4>Repeated results are proved once</h4>
        <p>
          The interval for a constant such as log π is proved once for each precision as its own lemma
          (<Src path="Zeta/Certificate/Named.lean" line={377}>sealedConst</Src>). Other bounds are also proved once as their own lemma, one for
          each distinct statement (<Src path="Zeta/Certificate/Named.lean" line={347}>cachedNear</Src>), and the Euler–Maclaurin builder
          proves its running sum as a lemma every <Src path="Zeta/Certificate/Named.lean" line={128}>8</Src> terms. The kernel checks each of
          these lemmas once, however many times the proof uses it. In the tree, a box for such a lemma has a second outline.
        </p>
        <Example card={ex.sealed} onShow={onShow}>
          {ex.sealed && <>The interval for {ex.sealed.label} is proved once and used <b>{ex.sealed.citedBy}</b> times</>}
        </Example>
      </li>
    </ol>
  );
}

/** Proof size of every extracted certificate against height, log–log, with the open one ringed. */
export function SizeChart({ sizes, row }: { sizes: Manifest["sizes"]; row: number }) {
  const W = 560, H = 230, P = { l: 64, r: 16, t: 14, b: 40 };
  const lx = (t: number) => Math.log10(Math.max(t, 1));
  const ly = (v: number) => Math.log10(v);
  const x0 = 0, x1 = 4.05, y0 = 2.7, y1 = 4.55;
  const sx = (t: number) => P.l + ((lx(t) - x0) / (x1 - x0)) * (W - P.l - P.r);
  const sy = (v: number) => P.t + (1 - (ly(v) - y0) / (y1 - y0)) * (H - P.t - P.b);
  const open = sizes.find((s) => s.row === row);
  return (
    <figure className="zx-size">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Distinct proof steps of each extracted certificate against its height">
        {[1000, 3000, 10000, 30000].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={sy(v)} y2={sy(v)} className="zx-grid-line" />
            <text x={P.l - 8} y={sy(v)} textAnchor="end" dominantBaseline="middle" className="zx-tick">{fmt(v)}</text>
          </g>
        ))}
        {[1, 10, 100, 1000, 10000].map((t) => (
          <text key={t} x={sx(t)} y={H - 22} textAnchor="middle" className="zx-tick">{fmt(t)}</text>
        ))}
        <text x={(P.l + W - P.r) / 2} y={H - 4} textAnchor="middle" className="zx-axis">height t</text>
        <text transform={`translate(12 ${(P.t + H - P.b) / 2}) rotate(-90)`} textAnchor="middle" className="zx-axis">distinct proof steps</text>
        {sizes.map((s) => (
          <a key={s.row} href={`#/${s.row}`}>
            <circle cx={sx(Number(s.t))} cy={sy(s.steps)} r={s.row === row ? 6.5 : 4.5} className={`zx-size-pt ${s.method === "EM" ? "is-em" : "is-rs"}${s.row === row ? " is-sel" : ""}`}>
              <title>Certificate {fmt(s.row)} at t = {s.t}: {fmt(s.steps)} distinct proof steps</title>
            </circle>
          </a>
        ))}
        {open && <text x={sx(Number(open.t)) - 10} y={sy(open.steps) - 12} textAnchor="end" className="zx-size-label">#{fmt(open.row)}: {fmt(open.steps)}</text>}
      </svg>
      <figcaption>
        <b>Proof size against height.</b> Each point shows the number of distinct proof steps for a saved tree.
        Both axes are logarithmic. <span className="zx-key zx-key--em" /> Euler–Maclaurin.{" "}
        <span className="zx-key zx-key--rs" /> Riemann–Siegel.
      </figcaption>
    </figure>
  );
}
