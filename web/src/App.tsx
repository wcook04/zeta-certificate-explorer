import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArgumentTree, type MapViewHandle } from "./map/ArgumentTree";
import { certGraph } from "./certGraph";
import { MarginStrip } from "./MarginStrip";
import type { CertCard, CertTree, Manifest, Row, TreeStats } from "./types";

const DATA = `${import.meta.env.BASE_URL}data`;
const REPO = "https://github.com/smmercuri/zeta";
const ROW_H = 34;
const INSETS = { top: 12, right: 12, bottom: 12, left: 12 };

type Filter = "all" | "c1" | "detail" | "em";

const FILTERS: { id: Filter; label: string; test: (r: Row) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "detail", label: "Computation shown", test: (r) => !!r.detail },
  { id: "c1", label: "Uses C₁", test: (r) => r.variant === "C1" },
  { id: "em", label: "Euler–Maclaurin", test: (r) => r.method === "EM" },
];

const VARIANT_WORDS: Record<Row["variant"], string> = {
  EM: "Euler–Maclaurin",
  C0: "Riemann–Siegel",
  C1: "R–S with C₁",
};

function readRow(): number | null {
  const m = /^#\/(\d+)/.exec(window.location.hash);
  return m ? Number(m[1]) : null;
}

const fmt = (n: number) => n.toLocaleString("en-GB");

export function App() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(readRow);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    Promise.all([fetch(`${DATA}/catalogue.json`).then((r) => r.json()), fetch(`${DATA}/manifest.json`).then((r) => r.json())])
      .then(([c, m]) => {
        setRows(c as Row[]);
        setManifest(m as Manifest);
      })
      .catch((e) => setError(String(e)));
    const onHash = () => setSelected(readRow());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const choose = useCallback((row: number) => {
    window.location.hash = `#/${row}`;
  }, []);

  const shown = useMemo(() => (rows ? rows.filter(FILTERS.find((f) => f.id === filter)!.test) : []), [rows, filter]);
  const current = rows && selected ? rows[selected - 1] : null;

  return (
    <div className="zx">
      <a className="zx-skip" href="#intervals">Skip to the intervals</a>
      <header className="zx-head">
        <h1>Zero certificates up to height 10,011</h1>
        <p className="zx-lede">
          Every interval Salvatore Mercuri and Bhavik Mehta’s <a href={REPO}>Lean verification</a> certifies to contain a zero of Hardy’s Z
          function, with the numbers read from their compiled proof.
        </p>
      </header>

      <div className="zx-fig-slot">{rows && <MarginStrip rows={rows} selected={selected} onChoose={choose} />}</div>

      {error && <p className="zx-error">Could not load the data: {error}</p>}

      <main className="zx-main" id="intervals">
        <section className="zx-table" aria-label="Certified intervals">
          <div className="zx-filters" role="group" aria-label="Which intervals to list">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
                {rows && <span className="zx-count">{fmt(rows.filter(f.test).length)}</span>}
              </button>
            ))}
          </div>
          {rows && <Table rows={shown} selected={selected} onChoose={choose} />}
        </section>

        <section className="zx-detail" aria-label="The selected interval">
          {current && rows ? <Detail key={current.row} row={current} previous={rows[current.row - 2]} next={rows[current.row]} onChoose={choose} /> : <Welcome rows={rows} onChoose={choose} />}
        </section>
      </main>

      <footer className="zx-foot">
        <p>
          The verification, its Lean and its data are Salvatore Mercuri and Bhavik Mehta’s (<a href={REPO}>smmercuri/zeta</a>, Apache-2.0),
          built at commit {manifest?.provenance.zeta?.slice(0, 10) ?? "…"} with {manifest?.provenance.toolchain ?? "Lean"}. Every number here
          was read from their compiled proof by a program and rounded outward: an interval is never printed narrower, or a margin larger,
          than the proof shows. The program, this page and its plain-language labels were made by Will Cook with AI and have not been
          reviewed by the authors. <a href="https://github.com/wcook04/zeta-certificate-explorer">How it was made</a>.
        </p>
      </footer>
    </div>
  );
}

function Welcome({ rows, onChoose }: { rows: Row[] | null; onChoose(row: number): void }) {
  return (
    <div className="zx-welcome">
      <h2>Pick an interval</h2>
      <p>
        Each certificate shows two things at the ends of its interval: the approximation Z̃ of Hardy’s Z function has opposite signs, and at
        each end |Z̃| is larger than the proved bound on the approximation’s error. So Z itself changes sign, and ζ(½ + it) has a zero in
        between. A certificate proves existence inside its bracket; Turing’s method supplies the global count.
      </p>
      {rows && (
        <ul className="zx-starts">
          <li><button type="button" onClick={() => onChoose(53)}>The first Riemann–Siegel interval, 149.500 to 150.503</button></li>
          <li><button type="button" onClick={() => onChoose(6710)}>Compare the shared endpoint of two C₁ certificates near 7005</button></li>
          <li><button type="button" onClick={() => onChoose(1)}>The first interval, 1.000 to 17.846, by Euler–Maclaurin</button></li>
        </ul>
      )}
    </div>
  );
}

function Table({ rows, selected, onChoose }: { rows: Row[]; selected: number | null; onChoose(row: number): void }) {
  const box = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [height, setHeight] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el || selected == null) return;
    const i = rows.findIndex((r) => r.row === selected);
    if (i < 0) return;
    const y = i * ROW_H;
    if (y < el.scrollTop || y > el.scrollTop + el.clientHeight - ROW_H) el.scrollTop = Math.max(0, y - el.clientHeight / 3);
  }, [selected, rows]);
  const first = Math.max(0, Math.floor(top / ROW_H) - 10);
  const last = Math.min(rows.length, Math.ceil((top + height) / ROW_H) + 10);
  return (
    <div className="zx-grid" role="table" aria-rowcount={rows.length}>
      <div className="zx-tr zx-th" role="row">
        <span role="columnheader">No.</span>
        <span role="columnheader">Interval of height t</span>
        <span role="columnheader">Formula</span>
        <span role="columnheader" title="Lower bound on the smaller endpoint margin, rounded down">Margin ≥</span>
      </div>
      <div className="zx-scroll" ref={box} onScroll={(e) => setTop(e.currentTarget.scrollTop)}>
        <div style={{ height: rows.length * ROW_H, position: "relative" }}>
          {rows.slice(first, last).map((r, k) => {
            return (
              <button
                key={r.row}
                type="button"
                role="row"
                className={`zx-tr${r.row === selected ? " is-selected" : ""}${r.variant === "C1" ? " is-c1" : ""}`}
                style={{ top: (first + k) * ROW_H }}
                aria-current={r.row === selected ? "true" : undefined}
                onClick={() => onChoose(r.row)}
              >
                <span className="zx-num">{fmt(r.row)}</span>
                <span className="zx-t">[{r.left}, {r.right}]</span>
                <span>{VARIANT_WORDS[r.variant]}</span>
                <span className="zx-num">
                  {r.marginShort ?? minDecimal(r.ends[0].margin, r.ends[1].margin)}
                  {r.detail && <span className="zx-dot" title="The computation is shown" aria-label="computation shown" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Detail({ row, previous, next, onChoose }: { row: Row; previous?: Row; next?: Row; onChoose(row: number): void }) {
  const [tree, setTree] = useState<CertTree | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [comparison, setComparison] = useState<0 | 1 | null>(null);
  const neighbours = [previous?.right === row.left ? previous : undefined, next?.left === row.right ? next : undefined] as const;
  useEffect(() => {
    setTree(null);
    setCard(null);
    setFocus(null);
    setTreeError(null);
    if (!row.detail) return;
    let live = true;
    fetch(`${DATA}/trees/${row.row}.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((t) => live && setTree(t as CertTree))
      .catch((e) => live && setTreeError(String(e)));
    return () => {
      live = false;
    };
  }, [row]);
  const graph = useMemo(() => (tree ? certGraph(tree) : null), [tree]);
  const byId = useMemo(() => new Map(tree?.nodes.map((n) => [n.id, n]) ?? []), [tree]);
  const noTrace = useCallback(() => undefined, []);
  const view = useRef<MapViewHandle>(null);
  const mapBox = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pointer, setPointer] = useState<[number, number]>([0, 0]);
  const sealedCss = useMemo(() => (tree ? tree.nodes.filter((n) => n.sealed && n.citedBy > 1)
    .map((n) => `.zx-map [data-record="${n.id}"]`).join(",") + "{outline:2px solid var(--formal);outline-offset:4px}" : ""), [tree]);
  // The page scrolls over the graph; the graph only zooms on a pinch or Ctrl/Cmd with the wheel.
  // Stopped in the capture phase on our wrapper, so the map engine itself is unchanged.
  useEffect(() => {
    const el = mapBox.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); };
    el.addEventListener("wheel", onWheel, { capture: true });
    let timer = 0;
    const ro = new ResizeObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(() => view.current?.fitAll(false), 150); });
    ro.observe(el);
    return () => { el.removeEventListener("wheel", onWheel, { capture: true }); ro.disconnect(); window.clearTimeout(timer); };
  }, [graph]);
  // Frame the certificate's first row once the tree has laid out in its box.
  // On opening the whole certificate, unfold to the two endpoint values and the error bound, so the
  // first picture already holds the numbers the certificate is about; then frame everything drawn.
  useEffect(() => {
    if (!graph || !tree) return;
    const t = window.setTimeout(() => {
      const ids = focus ? [] : tree.nodes.filter((n) => n.value && (n.label === "Z̃ at the left end" || n.label === "Z̃ at the right end" || n.label.startsWith("error bound"))).map((n) => n.id);
      if (ids.length) view.current?.revealIds(ids);
      window.setTimeout(() => view.current?.fitAll(false), 450);
    }, 120);
    return () => window.clearTimeout(t);
  }, [graph, tree, focus]);
  const jumpCards = tree ? [
    { label: "Left approximation", card: tree.nodes.find((n) => n.value && n.label === "Z̃ at the left end") },
    { label: "Right approximation", card: tree.nodes.find((n) => n.value && n.label === "Z̃ at the right end") },
    { label: "Error bound", card: tree.nodes.find((n) => n.value && n.label.startsWith("error bound")) },
  ].filter((x) => !!x.card) : [];

  return (
    <div className="zx-cert">
      <div className="zx-row-nav">
        <span>Interval {fmt(row.row)}, {VARIANT_WORDS[row.variant]}</span>
        <nav aria-label="Neighbouring intervals">
          {previous && <button type="button" onClick={() => onChoose(previous.row)}>← Previous</button>}
          {next && <button type="button" onClick={() => onChoose(next.row)}>Next →</button>}
        </nav>
      </div>
      <h2>A zero between t = {row.left} and t = {row.right}</h2>
      <p className="zx-conclusion">
        Z is {row.ends[0].sign === "+" ? "positive" : "negative"} at the left endpoint and {row.ends[1].sign === "+" ? "positive" : "negative"} at the right,
        even after allowing for both numerical enclosure width and approximation error. Continuity gives a zero inside the interval.
      </p>
      <Ends row={row} neighbours={neighbours} onCompare={setComparison} />
      {comparison !== null && neighbours[comparison] && (
        <EndpointComparison row={row} side={comparison} neighbour={neighbours[comparison]!} onClose={() => setComparison(null)} onChoose={onChoose} />
      )}
      <Variant row={row} />
      {row.detail ? (
        graph && tree ? (
          <div className="zx-work">
            <HowLean stats={tree.stats} />
            <style>{sealedCss}</style>
            <div className="zx-map" ref={mapBox} onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPointer([e.clientX - r.left, e.clientY - r.top]); }} onPointerLeave={() => setHover(null)}>
              <div className="zx-map-head">
                <div className="zx-map-jumps" role="group" aria-label="Start from a numerical quantity">
                  <button type="button" aria-pressed={!focus} onClick={() => { setFocus(null); setCard(null); }}>Whole certificate</button>
                  {jumpCards.map(({ label, card: target }) => <button key={label} type="button" aria-pressed={focus === target!.id} onClick={() => { setFocus(target!.id); setCard(target!.id); }}>{label}</button>)}
                </div>
                <p className="zx-map-note">Click a card to read it, open its inputs with the small arrow. Drag to move; pinch or hold Ctrl and scroll to zoom.</p>
              </div>
              <ArgumentTree
                key={`${tree.row}:${focus ?? tree.root}`}
                ref={view}
                graph={graph}
                goal={focus ?? tree.root}
                insets={INSETS}
                persist={false}
                mode="steps"
                oneCardEach
                fitMax={window.innerWidth >= 2000 ? 2 : 1.4}
                rootLabel={focus ? byId.get(focus)?.label : `Interval ${fmt(tree.row)}`}
                selected={card ?? undefined}
                onSelect={setCard}
                onHover={setHover}
                onTrace={noTrace}
              />
              {hover && hover !== card && byId.get(hover) && <HoverCard card={byId.get(hover)!} at={pointer} />}
              {card && byId.get(card) && <Inspector card={byId.get(card)!} onClose={() => setCard(null)} />}
            </div>
          </div>
        ) : (
          <p className={treeError ? "zx-error" : "zx-loading"}>{treeError ? `Could not load the computation: ${treeError}. The endpoint checks above are still available.` : "Loading the computation…"}</p>
        )
      ) : (
        <p className="zx-nodetail">
          The full computation for this interval has not been extracted yet. The numbers above come from its certificate in the compiled
          proof. The computation is shown for {""}
          <a href="#/53">zero 53</a>, <a href="#/6710">zero 6,710</a>, <a href="#/1">zero 1</a> and eleven others: use the
          "Computation shown" filter.
        </p>
      )}
    </div>
  );
}

/** Compare finite decimals as integers; the compatibility path never rounds a bound upward. */
function minDecimal(a: string, b: string): string {
  const parts = (s: string): [bigint, number] => {
    const [mantissa, exponent = "0"] = s.toLowerCase().split("e");
    const [whole, fraction = ""] = mantissa.split(".");
    return [BigInt(whole + fraction), fraction.length - Number(exponent)];
  };
  const [an, ap] = parts(a), [bn, bp] = parts(b), p = Math.max(ap, bp);
  return an * 10n ** BigInt(p - ap) <= bn * 10n ** BigInt(p - bp) ? a : b;
}

/** |Z̃| at least: the endpoint of the enclosure nearer zero. */
const nearZero = (z: [string, string]) => Math.min(Math.abs(Number(z[0])), Math.abs(Number(z[1])));

function sci(x: string): string {
  const n = Number(x);
  if (!Number.isFinite(n) || n === 0) return x;
  if (Math.abs(n) >= 1e-3) return x;
  const [m, ex] = n.toExponential(2).split("e");
  return `${m} × 10${ex.replace("-", "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)])}`;
}

function Ends({ row, neighbours, onCompare }: { row: Row; neighbours: readonly (Row | undefined)[]; onCompare(side: 0 | 1): void }) {
  const t = [row.left, row.right];
  return (
    <div className="zx-gauges">
      {row.ends.map((e, i) => {
        const a = nearZero(e.z);
        const b = Number(e.bound);
        // each bar has its own scale, so the share of |Z̃| taken by the error bound is what shows
        const scale = Math.max(a, b) * 1.02;
        const pct = (x: number) => `${Math.max(0, Math.min(100, (x / scale) * 100))}%`;
        const tinyError = b / scale < 0.004;
        return (
          <div className="zx-gauge" key={i}>
            <div className="zx-gauge-head">
              <span className="zx-gauge-t">t = {t[i]}</span>
              <span className={e.sign === "+" ? "is-pos" : "is-neg"}>Z(t) is {e.sign === "+" ? "positive" : "negative"}</span>
              {neighbours[i] && <button type="button" className="zx-compare" onClick={() => onCompare(i as 0 | 1)}>Compare with interval {fmt(neighbours[i]!.row)}</button>}
            </div>
            <div className="zx-bar" aria-hidden="true">
              <span className="zx-bar-margin" style={{ left: pct(b), width: `calc(${pct(a)} - ${pct(b)})` }} />
              <span className="zx-bar-error" style={{ width: tinyError ? "2px" : pct(b) }} />
              <span className="zx-bar-z" style={{ left: pct(a) }} />
              <span className="zx-bar-zero" />
            </div>
            <dl className="zx-gauge-nums">
              <div><dt>|Z̃(t)| at least</dt><dd>{a.toPrecision(6)}</dd></div>
              <div><dt>Error bound</dt><dd>{sci(e.bound)}{e.boundAt && e.boundAt !== t[i] ? <small> proved at t = {e.boundAt}</small> : null}</dd></div>
              <div><dt>Margin left</dt><dd>{e.margin}</dd></div>
              <div><dt>Error uses</dt><dd>{b / a < 0.001 ? "under 0.1%" : `${(100 * b / a).toPrecision(2)}%`} of |Z̃(t)|</dd></div>
              <div><dt>Z̃(t) enclosure</dt><dd>[{e.z[0]}, {e.z[1]}]</dd></div>
            </dl>
          </div>
        );
      })}
      <p className="zx-end-caption">Each bar runs from 0 to |Z̃(t)| at its own scale. The hatched part is the share taken by the proved error bound and the solid part is what is left, so Z(t) has the sign of Z̃(t). Bounds round outward and margins round down.</p>
    </div>
  );
}

function EndpointComparison({ row, side, neighbour, onClose, onChoose }: { row: Row; side: 0 | 1; neighbour: Row; onClose(): void; onChoose(row: number): void }) {
  const height = side === 0 ? row.left : row.right;
  const entries = [{ row, end: row.ends[side] }, { row: neighbour, end: neighbour.ends[side === 0 ? 1 : 0] }].sort((a, b) => a.row.row - b.row.row);
  return (
    <section className="zx-comparison" aria-label="Two certificates at the same endpoint">
      <div className="zx-row-nav"><h3>Same height, two certificates: t = {height}</h3><button type="button" onClick={onClose} aria-label="Close endpoint comparison">Close</button></div>
      <p>These adjacent intervals meet here. Each certificate proves the sign at this height; its approximation and bound may differ.</p>
      <div className="zx-end-wrap"><table className="zx-ends"><thead><tr><th>Interval</th><th>Formula</th><th>Approximation Z̃(t)</th><th>Error at most</th><th>Distance from 0, at least</th></tr></thead>
        <tbody>{entries.map(({ row: r, end }) => <tr key={r.row}>
          <th scope="row">{r.row === row.row ? fmt(r.row) : <button className="zx-compare" type="button" onClick={() => onChoose(r.row)}>{fmt(r.row)} →</button>}</th>
          <td>{r.variant === "C0" ? "R–S without C₁" : VARIANT_WORDS[r.variant]}</td>
          <td>[{end.z[0]}, {end.z[1]}]</td><td>{end.bound}</td><td>≥ {end.margin}</td>
        </tr>)}</tbody></table></div>
    </section>
  );
}

function HowLean({ stats: s }: { stats: TreeStats }) {
  const heads = s.kernelCheckHeads.map(([h, n]) => <span key={h}>{fmt(n)} <code>{h}</code></span>);
  return (
    <section className="zx-howlean" aria-label="How Lean computes this certificate">
      <h3>How Lean computes this certificate</h3>
      <p>
        The proof the kernel accepted has {fmt(s.proofSteps)} steps. {fmt(s.kernelChecks)} of them are comparisons of integer literals that the
        kernel evaluates itself ({heads.reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, ", ", x] : [x]), [])}), on literals of up to {s.longestKernelLiteral} digits.
      </p>
      <p>
        To keep those integers small, {fmt(s.recentrings)} steps re-centre an enclosure on new endpoints; {fmt(s.recentringsShortened)} of them
        shorten its numbers{s.biggestShortening ? <>, the largest from {s.biggestShortening[0]} digits to {s.biggestShortening[1]}</> : null}.
        {" "}{fmt(s.sealedLemmas)} enclosures are proved once as separate lemmas and cited by later steps{s.sealedMostCited > 1 ? <>, one of them {s.sealedMostCited} times</> : null}, so the kernel checks each of them once. In the graph below, a card with a second outline is one of these, cited by more than one quantity; hover over any card for how Lean reached its value.
      </p>
    </section>
  );
}

function HoverCard({ card, at }: { card: CertCard; at: [number, number] }) {
  const checks = card.checks.reduce((n, c) => n + c.count, 0);
  return (
    <div className="zx-hover" style={{ left: at[0] + 16, top: at[1] + 16 }} role="tooltip">
      <strong>{card.label}</strong>
      {card.value && <span>in [{card.value.lo}, {card.value.hi}]</span>}
      <span>Last step <code>{card.head.replace(/^_private\..*\.(_proof_\d+_\d+)$/, "sealed $1").replace(/^(Enclosure|BSN|Zeta\.Certificates)\./, "")}</code>{card.stepCount ? `, after ${card.stepCount} steps on the same value` : ""}</span>
      {card.sealed && <span>Proved once as a separate lemma{card.citedBy > 1 ? `, cited by ${card.citedBy} quantities` : ""}</span>}
      {card.recentred && <span>Re-centred from {card.recentred[0]} digits to {card.recentred[1]}</span>}
      {checks > 0 && <span>{checks} integer comparison{checks > 1 ? "s" : ""} the kernel evaluates{card.kernelLiteralDigits ? `, longest literal ${card.kernelLiteralDigits} digits` : ""}</span>}
      {card.digits > 0 && <span>The enclosure is written with {card.digits} digits</span>}
      <em>Click for the full statement</em>
    </div>
  );
}

function Variant({ row }: { row: Row }) {
  if (row.method === "EM") return (
    <p className="zx-variant">Euler–Maclaurin approximation, with cutoffs {row.params[0]} and {row.params[1]} and {row.params[2]} Bernoulli terms at the two ends. Each endpoint has its own error bound.</p>
  );
  const sameBound = row.ends[0].boundAt && row.ends[0].boundAt === row.ends[1].boundAt && row.ends[0].bound === row.ends[1].bound;
  return (
    <p className="zx-variant">
      {row.variant === "C1"
        ? "This certificate uses the Riemann–Siegel formula with C₁. The builder tries the version without C₁ first; the saved certificate identifies the successful version. Compare the shared endpoints to see which formulas the neighbouring certificates use. "
        : "This certificate uses the Riemann–Siegel formula without C₁, the version the builder tries first. "}
      {sameBound ? <>Both checks use the error bound proved at t = {row.ends[0].boundAt}. The bound decreases with height, so it also applies at these endpoints.</>
        : <>The left error bound was proved at t = {row.ends[0].boundAt ?? row.left}; the right at t = {row.ends[1].boundAt ?? row.right}.</>}
    </p>
  );
}

const CHECK_WORDS: Record<string, string> = {
  boolean_check: "a Boolean the kernel computes to the stated value",
  identity: "the same expression on both sides",
  conversion: "accepted by unfolding definitions",
  decide: "decided by evaluation",
};

function Inspector({ card, onClose }: { card: CertCard; onClose(): void }) {
  const checks = card.checks.reduce((n, c) => n + c.count, 0);
  return (
    <aside className="zx-inspect" aria-live="polite">
      <div className="zx-inspect-head"><h3>{card.label}</h3><button type="button" onClick={onClose} aria-label="Close">×</button></div>
      {card.subject && <p className="zx-subject"><code>{card.subject}</code></p>}
      {card.value && (
        <p className="zx-value">
          Proved to lie in <b>[{card.value.lo}, {card.value.hi}]</b>
        </p>
      )}
      {card.kind === "group" && <p className="zx-how">These are separate fields of the certificate, drawn as one card here.</p>}
      {card.steps.length > 0 && (
        <>
          <h4>{card.kind === "group" ? "The conditions" : `How Lean reached this value (${card.stepCount + 1} steps)`}</h4>
          <p className="zx-chain">
            {card.kind === "group"
              ? card.steps.map((s) => s.statement).join("; ")
              : [card.head, ...card.steps.map((s) => s.head)].slice(0, 10).map((h) => h.replace(/^_private\..*\.(_proof_\d+_\d+)$/, "sealed $1").replace(/^(Enclosure|BSN|Zeta\.Certificates)\./, "")).join(" ← ")}
            {card.steps.length > 9 ? " ← …" : ""}
          </p>
        </>
      )}
      {checks > 0 && (
        <>
          <h4>What the kernel computes here ({checks})</h4>
          <ul className="zx-checks">
            {card.checks.map((c, i) => (
              <li key={i}>{c.count} × <code>{c.head.replace(/^Enclosure\./, "").replace(/^BSN\./, "") || "—"}</code>, {CHECK_WORDS[c.kind] ?? c.kind}</li>
            ))}
          </ul>
          {card.checkExamples.length > 0 && <pre className="zx-example">{card.checkExamples[0]}</pre>}
        </>
      )}
      <h4>The statement proved</h4>
      <pre className="zx-example">{card.statement}</pre>
    </aside>
  );
}
