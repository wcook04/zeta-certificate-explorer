// What the certificate metaprogram does to keep the kernel's work small, in the terms of the source
// at the commit this page was built from, with each technique's count in the open certificate.

import type { CertTree, Manifest } from "./types";

const SRC = "https://github.com/smmercuri/zeta/blob/34037d5a7662e2eb6e970bfb22299c84e45ed5d9";
const fmt = (n: number) => n.toLocaleString("en-GB");

/** Long numerals in a kernel check, shortened for reading: 7402187635769028378624 → 74021…78624 (22 digits). */
export function shortLiterals(s: string): string {
  return s.replace(/\d{13,}/g, (d) => `${d.slice(0, 5)}…${d.slice(-5)} (${d.length} digits)`);
}

function Src({ path, line, children }: { path: string; line: number; children: React.ReactNode }) {
  return <a href={`${SRC}/${path}#L${line}`}><code>{children}</code></a>;
}

export function Metaprogram({ tree }: { tree: CertTree }) {
  const s = tree.stats;
  const quantities = tree.nodes.filter((n) => n.value).length;
  const example = tree.nodes.flatMap((n) => n.checkExamples).find((e) => /\d{10,}/.test(e)) ?? tree.nodes.flatMap((n) => n.checkExamples)[0];
  const heads = s.kernelCheckHeads.map(([h, n]) => `${fmt(n)} ${h}`).join(", ");
  return (
    <ol className="zx-tech">
      <li>
        <div>
          <h4>Every real number is four natural numbers</h4>
          <p>
            Each quantity is proved to satisfy |x − (±cn/cd)| ≤ rn/rd with cn, cd, rn and rd written as numerals{" "}
            (<Src path="Enclosure/Core.lean" line={23}>Real.IsNear</Src>). Interval arithmetic combines these enclosures, and an
            equation between two expressions is only used to change which expression an enclosure is about{" "}
            (<Src path="Zeta/Certificate/Named.lean" line={26}>Named.lean</Src>).
          </p>
        </div>
        <p className="zx-tech-here"><b>{fmt(quantities)}</b> enclosed quantities in this graph</p>
      </li>
      <li>
        <div>
          <h4>Every inequality is a Boolean on numerals</h4>
          <p>
            The side conditions of the enclosure lemmas are stated with <code>Nat.ble</code>, <code>Nat.beq</code>, <code>Nat.mul</code> and
            similar functions and proved by <code>rfl</code>. The kernel decides them with its built-in arithmetic on numerals, without
            unfolding the definition of a real number. Several conditions are packed into one Boolean where possible:{" "}
            <Src path="Enclosure/Defs.lean" line={31}>recentreOk</Src> holds the six conditions of a re-centring step.
          </p>
          {example && <pre className="zx-tech-ex">{shortLiterals(example)}</pre>}
        </div>
        <p className="zx-tech-here"><b>{fmt(s.kernelChecks)}</b> such checks here ({heads})</p>
      </li>
      <li>
        <div>
          <h4>The numerals are kept short</h4>
          <p>
            Products of fractions make numerators and denominators grow. When a denominator passes a size cap,{" "}
            <Src path="Enclosure/BinarySplit/Tactic/Enclosures.lean" line={119}>renorm</Src> replaces the enclosure with one whose centre
            lies on a coarser dyadic grid and whose radius is larger by the rounding, proved by{" "}
            <Src path="Enclosure/Arith.lean" line={546}>Real.IsNear.recentre'</Src>.
          </p>
        </div>
        <p className="zx-tech-here">
          <b>{fmt(s.recentrings)}</b> re-centrings here; {fmt(s.recentringsShortened)} shorten the numerals
          {s.biggestShortening ? <>, at most from {s.biggestShortening[0]} digits to {s.biggestShortening[1]}</> : null}
        </p>
      </li>
      <li>
        <div>
          <h4>Shared results are proved once and cited</h4>
          <p>
            Constants such as log π are proved once for each working precision (<Src path="Zeta/Certificate/Named.lean" line={377}>sealedConst</Src>),
            other closed enclosures are proved as separate lemmas that are deduplicated by statement (
            <Src path="Zeta/Certificate/Named.lean" line={347}>cachedNear</Src>), and in the Euler–Maclaurin builder a running sum is sealed as a lemma every{" "}
            <Src path="Zeta/Certificate/Named.lean" line={128}>8</Src> steps. Each lemma is checked by the kernel once, however often it is
            cited.
          </p>
        </div>
        <p className="zx-tech-here">
          <b>{fmt(s.sealedLemmas)}</b> lemmas here{s.sealedMostCited > 1 ? <>, one cited {s.sealedMostCited} times</> : null}; in the graph
          below, those cited more than once have a second outline
        </p>
      </li>
    </ol>
  );
}

/** Proof size of every extracted certificate against height, log–log, with the open one ringed. */
export function SizeChart({ sizes, row }: { sizes: Manifest["sizes"]; row: number }) {
  const W = 520, H = 190, P = { l: 52, r: 12, t: 12, b: 34 };
  const lx = (t: number) => Math.log10(Math.max(t, 1));
  const ly = (v: number) => Math.log10(v);
  const x0 = 0, x1 = 4.05, y0 = 2.7, y1 = 4.55;
  const sx = (t: number) => P.l + ((lx(t) - x0) / (x1 - x0)) * (W - P.l - P.r);
  const sy = (v: number) => P.t + (1 - (ly(v) - y0) / (y1 - y0)) * (H - P.t - P.b);
  return (
    <figure className="zx-size">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Distinct proof steps of each extracted certificate against its height">
        {[1000, 3000, 10000, 30000].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={sy(v)} y2={sy(v)} className="zx-sign-grid" />
            <text x={P.l - 6} y={sy(v)} textAnchor="end" dominantBaseline="middle" className="zx-sign-tick">{fmt(v)}</text>
          </g>
        ))}
        {[1, 10, 100, 1000, 10000].map((t) => (
          <text key={t} x={sx(t)} y={H - 16} textAnchor="middle" className="zx-sign-tick">{fmt(t)}</text>
        ))}
        <text x={(P.l + W - P.r) / 2} y={H - 2} textAnchor="middle" className="zx-sign-tick">height t (log scale)</text>
        {sizes.map((s) => (
          <a key={s.row} href={`#/${s.row}`}>
            <circle cx={sx(Number(s.t))} cy={sy(s.steps)} r={s.row === row ? 6 : 4} className={`zx-size-pt ${s.method === "EM" ? "is-em" : "is-rs"}${s.row === row ? " is-sel" : ""}`}>
              <title>Certificate {fmt(s.row)} at t = {s.t}: {fmt(s.steps)} distinct proof steps</title>
            </circle>
          </a>
        ))}
      </svg>
      <figcaption>
        Distinct proof steps of the fourteen extracted certificates, by height (both scales logarithmic; click a point to open it). The
        Euler–Maclaurin certificates below t = 149.5 have about 22,000 steps each; the Riemann–Siegel certificates start near 730 and reach
        about 2,800 at t = 10,000, as the main sum grows from 4 terms to 39 (⌊√(t/2π)⌋ terms).
      </figcaption>
    </figure>
  );
}
