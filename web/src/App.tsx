import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArgumentTree, type MapViewHandle } from "./map/ArgumentTree";
import { certGraph } from "./certGraph";
import { MarginStrip } from "./MarginStrip";
import { SignChart } from "./SignChart";
import { Metaprogram, SizeChart, shortLiterals } from "./Metaprogram";
import type { CertCard, CertTree, Manifest, Row } from "./types";

const DATA = `${import.meta.env.BASE_URL}data`;
const REPO = "https://github.com/smmercuri/zeta";
const ROW_H = 34;
const INSETS = { top: 12, right: 12, bottom: 12, left: 12 };

type Filter = "all" | "c1" | "detail" | "em";

const FILTERS: { id: Filter; label: string; test: (r: Row) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "detail", label: "With proof tree", test: (r) => !!r.detail },
  { id: "c1", label: "Uses C₁", test: (r) => r.variant === "C1" },
  { id: "em", label: "E–M", test: (r) => r.method === "EM" },
];

const VARIANT_WORDS: Record<Row["variant"], string> = {
  EM: "Euler–Maclaurin",
  C0: "Riemann–Siegel",
  C1: "Riemann–Siegel + C₁",
};
const VARIANT_SHORT: Record<Row["variant"], string> = { EM: "E–M", C0: "R–S", C1: "R–S + C₁" };

function readRow(): number | null {
  const m = /^#\/(\d+)/.exec(window.location.hash);
  return m ? Number(m[1]) : 6710;
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
        <div className="zx-intro">
          <p className="zx-kicker">The certificates in the Lean proof that the Riemann hypothesis holds up to height 10,011</p>
          <h1>10,156 zero certificates, and how Lean checks them</h1>
          <p className="zx-lede">
            Salvatore Mercuri and Bhavik Mehta’s <a href={REPO}>Lean proof</a> places a zero of ζ(½ + it) in each of 10,156 short intervals of t,
            by showing that Hardy’s Z function changes sign across the interval. In Python each check is a few lines of arithmetic. Lean’s kernel
            is slow at arithmetic, so the authors wrote a metaprogram that builds each certificate’s proof from lemmas whose side conditions
            are comparisons between integers, which the kernel evaluates quickly. Every certificate is listed below with the numbers read from the compiled proof, and for
            fourteen of them you can open the proof as a tree of the numbers it computes.
          </p>
          <nav className="zx-starts" aria-label="Places to start">
            <span className="zx-starts-h">Start with</span>
            <a href="#/6710"><b>#6,710</b> near t = 7005, one of a pair that needed the C₁ term</a>
            <a href="#/53"><b>#53</b> the first Riemann–Siegel certificate</a>
            <a href="#/1"><b>#1</b> the first, computed with Euler–Maclaurin</a>
          </nav>
        </div>
        <div className="zx-overview">{rows && <MarginStrip rows={rows} selected={selected} onChoose={choose} height={250} />}</div>
      </header>

      {error && <p className="zx-error">Could not load the data: {error}</p>}

      <main className="zx-main" id="intervals">
        <section className="zx-table" aria-label="Certified intervals">
          <div className="zx-filters" role="group" aria-label="Which intervals to list">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.id === "detail" && <GraphIcon />}
                {f.label}
                {rows && <span className="zx-count">{fmt(rows.filter(f.test).length)}</span>}
              </button>
            ))}
          </div>
          {rows && <Table rows={shown} selected={selected} onChoose={choose} />}
        </section>

        <section className="zx-detail" aria-label="The selected interval">
          {current && rows ? <Detail key={current.row} rows={rows} manifest={manifest} row={current} previous={rows[current.row - 2]} next={rows[current.row]} onChoose={choose} /> : <p className="zx-loading">Loading the certificates…</p>}
          <footer className="zx-foot">
            <div>
              <h3>The proof</h3>
              <p>
                Salvatore Mercuri and Bhavik Mehta’s, with its Lean and its data (<a href={REPO}>smmercuri/zeta</a>, Apache-2.0), built here at
                commit {manifest?.provenance.zeta?.slice(0, 10) ?? "…"} with {manifest?.provenance.toolchain ?? "Lean"}.
              </p>
            </div>
            <div>
              <h3>The numbers</h3>
              <p>
                A program read every number on this page from the compiled proof and rounded it outward, so no interval is printed narrower and
                no margin larger than the proof gives.
              </p>
            </div>
            <div>
              <h3>This page</h3>
              <p>
                Will Cook made the program and this page with AI, and the authors have not reviewed either.{" "}
                <a href="https://github.com/wcook04/zeta-certificate-explorer">How it was made</a>.
              </p>
            </div>
          </footer>
        </section>
      </main>

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
  const at = selected == null ? -1 : rows.findIndex((r) => r.row === selected);
  const away = at >= 0 && (at * ROW_H < top - ROW_H / 2 || at * ROW_H > top + height - ROW_H / 2) ? (at * ROW_H < top ? "up" : "down") : null;
  const back = () => { const el = box.current; if (el) el.scrollTo({ top: Math.max(0, at * ROW_H - el.clientHeight / 3), behavior: "smooth" }); };
  const first = Math.max(0, Math.floor(top / ROW_H) - 10);
  const last = Math.min(rows.length, Math.ceil((top + height) / ROW_H) + 10);
  return (
    <div className="zx-grid" role="table" aria-rowcount={rows.length}>
      <div className="zx-tr zx-th" role="row">
        <span role="columnheader">No.</span>
        <span role="columnheader">Interval of t</span>
        <span role="columnheader">Formula</span>
        <span role="columnheader" title="How far |Z̃| exceeds the error bound at the tighter end, rounded down">Margin</span>
        <span role="columnheader" aria-label="Has a proof tree" />
      </div>
      {selected != null && at < 0 && <p className="zx-away">#{fmt(selected)} is open but hidden by this filter.</p>}
      <div className="zx-scroll" ref={box} onScroll={(e) => setTop(e.currentTarget.scrollTop)}>
        <div style={{ height: rows.length * ROW_H, position: "relative" }}>
          {rows.slice(first, last).map((r, k) => {
            return (
              <button
                key={r.row}
                type="button"
                role="row"
                className={`zx-tr is-${r.variant.toLowerCase()}${r.row === selected ? " is-selected" : ""}`}
                style={{ top: (first + k) * ROW_H }}
                aria-current={r.row === selected ? "true" : undefined}
                onClick={() => onChoose(r.row)}
              >
                <span className="zx-num">{fmt(r.row)}</span>
                <span className="zx-t">[{r.left}, {r.right}]</span>
                <span className="zx-formula">{VARIANT_SHORT[r.variant]}</span>
                <span className="zx-num">{r.marginShort ?? minDecimal(r.ends[0].margin, r.ends[1].margin)}</span>
                <span className="zx-has">{r.detail && <GraphIcon label="has a proof tree" />}</span>
              </button>
            );
          })}
        </div>
      </div>
      {away && <button type="button" className="zx-back" onClick={back}>{away === "up" ? "↑" : "↓"} Back to #{fmt(selected!)}</button>}
    </div>
  );
}

function GraphIcon({ label }: { label?: string }) {
  return (
    <svg className="zx-gicon" viewBox="0 0 12 12" width="12" height="12" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d="M6 2.5V6M6 6L2.5 9.5M6 6l3.5 3.5" />
      <circle cx="6" cy="2.2" r="1.7" /><circle cx="2.2" cy="9.8" r="1.7" /><circle cx="9.8" cy="9.8" r="1.7" />
    </svg>
  );
}

function Detail({ rows, manifest, row, previous, next, onChoose }: { rows: Row[]; manifest: Manifest | null; row: Row; previous?: Row; next?: Row; onChoose(row: number): void }) {
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
    if (!graph || !tree || want) return;
    const t = window.setTimeout(() => {
      const top = focus ? [] : tree.nodes.filter((n) => n.value && (n.label === "Z̃ at the left end" || n.label === "Z̃ at the right end" || n.label.startsWith("error bound")));
      const ids = [...top.map((n) => n.id), ...top.flatMap((n) => n.uses)];
      if (ids.length) view.current?.revealIds(ids);
      window.setTimeout(() => view.current?.fitAll(false), 450);
    }, 120);
    return () => window.clearTimeout(t);
  }, [graph, tree, focus]); // eslint-disable-line react-hooks/exhaustive-deps
  const jumpCards = tree ? [
    { label: "Z̃ at the left end", card: tree.nodes.find((n) => n.value && n.label === "Z̃ at the left end") },
    { label: "Z̃ at the right end", card: tree.nodes.find((n) => n.value && n.label === "Z̃ at the right end") },
    { label: "Error bound", card: tree.nodes.find((n) => n.value && n.label.startsWith("error bound")) },
  ].filter((x) => !!x.card) : [];

  // A technique's example: draw the branch that reaches that step, frame it and open its statement.
  const [want, setWant] = useState<string | null>(null);
  const showExample = useCallback((id: string) => {
    if (focus) { setFocus(null); setWant(id); return; }
    const drawn = view.current?.focusIds([id], { exclusive: true });
    if (!drawn) setFocus(id);
    setCard(id);
    mapBox.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focus]);
  useEffect(() => {
    if (!want || focus || !graph) return;
    const t = window.setTimeout(() => { showExample(want); setWant(null); }, 700);
    return () => window.clearTimeout(t);
  }, [want, focus, graph, showExample]);

  const sign = (e: Row["ends"][number]) => (e.sign === "+" ? "positive" : "negative");
  return (
    <article className="zx-cert">
      <div className="zx-idbar">
        <p>
          <b>Certificate #{fmt(row.row)}</b>
          <span className={`zx-chip is-${row.variant.toLowerCase()}`}>{VARIANT_WORDS[row.variant]}</span>
          <span className="zx-idbar-t">t ∈ [{row.left}, {row.right}]</span>
        </p>
        <nav aria-label="Neighbouring certificates">
          {previous && <button type="button" onClick={() => onChoose(previous.row)} aria-label={`Previous certificate, ${fmt(previous.row)}`}>← #{fmt(previous.row)}</button>}
          {next && <button type="button" onClick={() => onChoose(next.row)} aria-label={`Next certificate, ${fmt(next.row)}`}>#{fmt(next.row)} →</button>}
        </nav>
      </div>

      <header className="zx-cert-head">
        <div>
          <h2>A zero between t = {row.left} and t = {row.right}</h2>
          <p className="zx-conclusion">
            Z(t) is <span className={row.ends[0].sign === "+" ? "zx-pos" : "zx-neg"}>{sign(row.ends[0])}</span> at the left end and{" "}
            <span className={row.ends[1].sign === "+" ? "zx-pos" : "zx-neg"}>{sign(row.ends[1])}</span> at the right, after allowing for the
            rounding in the computation and for the error of the approximation. Z is continuous, so it is zero somewhere in between.
          </p>
        </div>
        <dl className="zx-verdict">
          {row.ends.map((e, i) => (
            <div key={i} className={e.sign === "+" ? "is-pos" : "is-neg"}>
              <dt>Z({i === 0 ? row.left : row.right})</dt>
              <dd><span className="zx-verdict-sign">{e.sign === "+" ? "> 0" : "< 0"}</span><span>in [{e.trueZ[0]}, {e.trueZ[1]}]</span></dd>
            </div>
          ))}
          <p>Z stays at least <b>{row.marginShort}</b> away from 0 at both ends</p>
        </dl>
      </header>

      <section className="zx-block" aria-labelledby="how">
        <div className="zx-how-intro">
        <div>
        <h3 id="how" className="zx-section">How Lean checks this certificate</h3>
        <p className="zx-prose">
          In Python the two checks at the end of this page take a few lines and a fraction of a second. Lean’s kernel is slow at arithmetic,
          and the sums get longer with height, so the metaprogram builds the proof from lemmas whose side conditions are comparisons between
          integers, which the kernel evaluates quickly.
          {row.detail ? " Below are four techniques from the metaprogram’s source, how many times each is used in this certificate’s proof, and one place it is used, which you can open in the tree." : null}
        </p>
        </div>
        {manifest?.sizes && <SizeChart sizes={manifest.sizes} row={row.row} />}
        </div>
        {row.detail ? (
          graph && tree ? (
            <div className="zx-bench">
              <Metaprogram tree={tree} onShow={showExample} />
              <div className="zx-bench-graph">
                <style>{sealedCss}</style>
                <div className="zx-map" ref={mapBox} onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPointer([e.clientX - r.left, e.clientY - r.top]); }} onPointerLeave={() => setHover(null)}>
                  <div className="zx-map-head">
                    <div className="zx-map-title">
                      <h4>The proof term, as a graph</h4>
                      <p className="zx-map-note">Hover over a box to see the interval proved for its number and the lemma that proves it. Click a box for the full Lean statement, and click the arrow under a box to show the numbers it is computed from. Drag to move and Ctrl-scroll to zoom. A box with a second outline is a lemma used more than once.</p>
                    </div>
                    <div className="zx-map-tools">
                      <div className="zx-seg" role="group" aria-label="Start the graph from one quantity">
                        <button type="button" aria-pressed={!focus} onClick={() => { setFocus(null); setCard(null); }}>Whole certificate</button>
                        {jumpCards.map(({ label, card: target }) => <button key={label} type="button" aria-pressed={focus === target!.id} onClick={() => { setFocus(target!.id); setCard(target!.id); }}>{label}</button>)}
                      </div>
                      <div className="zx-zoom" role="group" aria-label="Zoom">
                        <button type="button" onClick={() => view.current?.zoomBy(1 / 1.25)} aria-label="Zoom out">−</button>
                        <button type="button" onClick={() => view.current?.fitAll(true)}>Fit</button>
                        <button type="button" onClick={() => view.current?.zoomBy(1.25)} aria-label="Zoom in">+</button>
                      </div>
                    </div>
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
                    fitMax={1.5}
                    rootLabel={focus ? byId.get(focus)?.label : `Certificate ${fmt(tree.row)}`}
                    selected={card ?? undefined}
                    onSelect={setCard}
                    onHover={setHover}
                    onTrace={noTrace}
                  />
                  {hover && hover !== card && byId.get(hover) && <HoverCard card={byId.get(hover)!} at={pointer} />}
                  {card && byId.get(card) && <Inspector card={byId.get(card)!} onClose={() => setCard(null)} />}
                </div>
              </div>
            </div>
          ) : (
            <p className={treeError ? "zx-error" : "zx-loading"}>{treeError ? `Could not load the computation: ${treeError}.` : "Loading the computation…"}</p>
          )
        ) : (
          <div className="zx-nodetail">
            <p>
              A proof tree has been made for fourteen certificates so far, and #{fmt(row.row)} is not one of them. The numbers in the two
              checks below are still read from this certificate in the compiled proof.
            </p>
            <p>
              Open <a href="#/6710">#6,710</a> (Riemann–Siegel with C₁), <a href="#/53">#53</a> (Riemann–Siegel) or <a href="#/1">#1</a>{" "}
              (Euler–Maclaurin), or list all fourteen with the “With proof tree” filter.
            </p>
          </div>
        )}
      </section>

      <section className="zx-block" aria-labelledby="checks">
        <h3 id="checks" className="zx-section">The two checks that place a zero in this interval</h3>
        <p className="zx-prose">
          Both checks are on Z̃, the approximation to Z(t) that the certificate computes, at the two ends of the interval. First, Z̃ has
          opposite signs at the two ends. Second, at each end |Z̃| is larger than the error bound, which is the most Z̃ can differ from
          Z(t). Together they prove that Z(t) has opposite signs at the two ends, so Z has a zero between them.
        </p>
        <div className="zx-checks-fig">
          <SignChart rows={rows} row={row} onChoose={onChoose} />
          <div className="zx-checks-low">
            <Ends row={row} neighbours={neighbours} onCompare={setComparison} />
            <div className="zx-notes">
              <p>
                Z̃ is the approximation the certificate computes, and the proof encloses it in the range shown using exact rational
                arithmetic. Adding the error bound on both sides gives the range for Z. The margin is how far the range for Z stays from 0.
                Ranges are rounded outward and margins downward.
              </p>
              <Variant row={row} />
            </div>
          </div>
          {comparison !== null && neighbours[comparison] && (
            <EndpointComparison row={row} side={comparison} neighbour={neighbours[comparison]!} onClose={() => setComparison(null)} onChoose={onChoose} />
          )}
        </div>
      </section>
    </article>
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
    <div className="zx-end-wrap">
      <table className="zx-ends">
        <thead>
          <tr><th>t</th><th>Z̃(t) is in</th><th>Error bound</th><th>Z(t) is in</th><th>Margin</th><th></th></tr>
        </thead>
        <tbody>
          {row.ends.map((e, i) => (
            <tr key={i}>
              <th scope="row">{t[i]}</th>
              <td>[{e.z[0]}, {e.z[1]}]</td>
              <td>{sci(e.bound)}{e.boundAt && e.boundAt !== t[i] ? <span className="zx-at"> proved at t = {e.boundAt}</span> : null}</td>
              <td className={e.sign === "+" ? "is-pos" : "is-neg"}>[{e.trueZ[0]}, {e.trueZ[1]}]</td>
              <td>{e.margin}</td>
              <td>{neighbours[i] && <button type="button" className="zx-compare" onClick={() => onCompare(i as 0 | 1)}>Compare with {fmt(neighbours[i]!.row)}</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointComparison({ row, side, neighbour, onClose, onChoose }: { row: Row; side: 0 | 1; neighbour: Row; onClose(): void; onChoose(row: number): void }) {
  const height = side === 0 ? row.left : row.right;
  const entries = [{ row, end: row.ends[side] }, { row: neighbour, end: neighbour.ends[side === 0 ? 1 : 0] }].sort((a, b) => a.row.row - b.row.row);
  return (
    <section className="zx-comparison" aria-label="Two certificates at the same endpoint">
      <div className="zx-row-nav"><h3>Same height, two certificates: t = {height}</h3><button type="button" onClick={onClose} aria-label="Close endpoint comparison">Close</button></div>
      <p>Both certificates end at this height, and each proves the sign of Z here with its own approximation and error bound.</p>
      <div className="zx-end-wrap"><table className="zx-ends"><thead><tr><th>Interval</th><th>Formula</th><th>Approximation Z̃(t)</th><th>Error at most</th><th>Distance from 0, at least</th></tr></thead>
        <tbody>{entries.map(({ row: r, end }) => <tr key={r.row}>
          <th scope="row">{r.row === row.row ? fmt(r.row) : <button className="zx-compare" type="button" onClick={() => onChoose(r.row)}>{fmt(r.row)} →</button>}</th>
          <td>{r.variant === "C0" ? "R–S without C₁" : VARIANT_WORDS[r.variant]}</td>
          <td>[{end.z[0]}, {end.z[1]}]</td><td>{end.bound}</td><td>≥ {end.margin}</td>
        </tr>)}</tbody></table></div>
    </section>
  );
}

function HoverCard({ card, at }: { card: CertCard; at: [number, number] }) {
  const checks = card.checks.reduce((n, c) => n + c.count, 0);
  return (
    <div className="zx-hover" style={{ left: at[0] + 16, top: at[1] + 16 }} role="tooltip">
      <strong>{card.label}</strong>
      {card.value && <span>in [{card.value.lo}, {card.value.hi}]</span>}
      <span>Proved by <code>{card.head.replace(/^_private\..*\.(_proof_\d+_\d+)$/, "sealed $1").replace(/^(Enclosure|BSN|Zeta\.Certificates)\./, "")}</code>{card.stepCount ? `, after ${card.stepCount} more lemmas applied to the same number` : ""}</span>
      {card.sealed && <span>Proved once as a separate lemma{card.citedBy > 1 ? `, used by ${card.citedBy} other boxes` : ""}</span>}
      {card.recentred && <span>Rewritten with shorter fractions, from {card.recentred[0]} digits to {card.recentred[1]} across its four integers</span>}
      {checks > 0 && <span>The kernel evaluates {checks} integer comparison{checks > 1 ? "s" : ""} here, the longest integer {card.kernelLiteralDigits} digits long</span>}
      {card.checkExamples[0] && <code className="zx-hover-ex">{shortLiterals(card.checkExamples[0])}</code>}
      {card.digits > 0 && <span>Its interval is written with {card.digits} digits in total</span>}
      <em>Click for the full statement.</em>
    </div>
  );
}

function Variant({ row }: { row: Row }) {
  if (row.method === "EM") return (
    <p className="zx-variant">
      Euler–Maclaurin approximation with cutoffs {row.params[0]} and {row.params[1]} and {row.params[2]} Bernoulli terms. Each endpoint has
      its own error bound.
    </p>
  );
  const sameBound = row.ends[0].boundAt && row.ends[0].boundAt === row.ends[1].boundAt && row.ends[0].bound === row.ends[1].bound;
  return (
    <p className="zx-variant">
      {row.variant === "C1"
        ? "The certificate builder first tries the Riemann–Siegel formula without the C₁ term, and this certificate uses the formula with it. Only 74 of the 10,104 Riemann–Siegel certificates use C₁, always in neighbouring pairs that share an endpoint. "
        : "Riemann–Siegel formula without the C₁ term, which the certificate builder tries first. "}
      {sameBound
        ? <>Both endpoints use one error bound, proved at t = {row.ends[0].boundAt}, the lowest height in its batch of certificates. The bound decreases with t, so it holds at both endpoints.</>
        : <>The left error bound was proved at t = {row.ends[0].boundAt ?? row.left} and the right one at t = {row.ends[1].boundAt ?? row.right}.</>}
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
      {card.kind === "group" && <p className="zx-how">These are separate fields of the certificate, drawn as one box here.</p>}
      {card.steps.length > 0 && (
        <>
          <h4>{card.kind === "group" ? "The conditions" : `The lemmas applied to this number (${card.stepCount + 1})`}</h4>
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
          <h4>Integer comparisons the kernel evaluates ({checks})</h4>
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
