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
  { id: "detail", label: "Computation shown", test: (r) => !!r.detail },
  { id: "c1", label: "Uses C₁", test: (r) => r.variant === "C1" },
  { id: "em", label: "Euler–Maclaurin", test: (r) => r.method === "EM" },
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
        <h1>Zero certificates up to height 10,011</h1>
        <p className="zx-lede">
          Salvatore Mercuri and Bhavik Mehta’s <a href={REPO}>Lean proof</a> that the Riemann hypothesis holds up to height 10,011 uses
          10,156 certificates. Each one shows that Hardy’s Z function changes sign on a short interval of t, so ζ(½ + it) has a zero there.
          This page lists every certificate with its numbers read from the compiled proof. For fourteen of them it shows how the
          certificate metaprogram builds a proof that Lean’s kernel can check quickly, and the proof term itself as a graph.
        </p>
        <p className="zx-starts">
          Places to start: <a href="#/6710">the pair of intervals near t = 7005</a>, where both certificates needed the C₁ term;{" "}
          <a href="#/53">the first Riemann–Siegel certificate</a>; <a href="#/1">the first certificate</a>, by Euler–Maclaurin.
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
          {current && rows ? <Detail key={current.row} rows={rows} manifest={manifest} row={current} previous={rows[current.row - 2]} next={rows[current.row]} onChoose={choose} /> : <p className="zx-loading">Loading the certificates…</p>}
        </section>
      </main>

      <footer className="zx-foot">
        <p>
          The proof, its Lean and its data are Salvatore Mercuri and Bhavik Mehta’s (<a href={REPO}>smmercuri/zeta</a>, Apache-2.0), built here
          at commit {manifest?.provenance.zeta?.slice(0, 10) ?? "…"} with {manifest?.provenance.toolchain ?? "Lean"}. A program read every number
          on this page from the compiled proof and rounded it outward, so no interval is printed narrower and no margin larger than the proof
          gives. Will Cook made the program and this page with AI, and the authors have not reviewed either.{" "}
          <a href="https://github.com/wcook04/zeta-certificate-explorer">How it was made</a>.
        </p>
      </footer>
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
        <span role="columnheader">Interval of t</span>
        <span role="columnheader">Formula</span>
        <span role="columnheader" title="How far |Z̃| exceeds the error bound at the tighter end, rounded down">Margin</span>
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
                <span>{VARIANT_SHORT[r.variant]}</span>
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

  const sign = (e: Row["ends"][number]) => (e.sign === "+" ? "positive" : "negative");
  return (
    <div className="zx-cert">
      <div className="zx-row-nav">
        <span>Certificate {fmt(row.row)} of 10,156, {VARIANT_WORDS[row.variant]}</span>
        <nav aria-label="Neighbouring intervals">
          {previous && <button type="button" onClick={() => onChoose(previous.row)}>← {fmt(previous.row)}</button>}
          {next && <button type="button" onClick={() => onChoose(next.row)}>{fmt(next.row)} →</button>}
        </nav>
      </div>
      <h2>A zero between t = {row.left} and t = {row.right}</h2>
      <p className="zx-conclusion">
        Z(t) is {sign(row.ends[0])} at the left end and {sign(row.ends[1])} at the right, after allowing for the rounding in the computation and
        for the error of the approximation. Z is continuous, so it is zero somewhere in between.
      </p>
      <h3 className="zx-section">How Lean checks this certificate</h3>
      <p className="zx-variant">
        In Python the two checks below take a few lines and a fraction of a second. Lean’s kernel is slow at arithmetic, and the sums
        get longer with height, so the metaprogram builds the proof in a form the kernel can check quickly. Four of the techniques in its
        source are below, each with its count in this certificate.
      </p>
      {row.detail ? (
        graph && tree ? (
          <div className="zx-work">
            <Metaprogram tree={tree} />
            {manifest?.sizes && <SizeChart sizes={manifest.sizes} row={row.row} />}
            <h4 className="zx-sub">The proof term, as a graph</h4>
            <style>{sealedCss}</style>
            <div className="zx-map" ref={mapBox} onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPointer([e.clientX - r.left, e.clientY - r.top]); }} onPointerLeave={() => setHover(null)}>
              <div className="zx-map-head">
                <div className="zx-map-jumps" role="group" aria-label="Start the graph from one quantity">
                  <button type="button" aria-pressed={!focus} onClick={() => { setFocus(null); setCard(null); }}>Whole certificate</button>
                  {jumpCards.map(({ label, card: target }) => <button key={label} type="button" aria-pressed={focus === target!.id} onClick={() => { setFocus(target!.id); setCard(target!.id); }}>{label}</button>)}
                </div>
                <p className="zx-map-note">Hover a card for how Lean got its value, click it for the full statement, and use the arrow under it to open its inputs. Drag to move; pinch or Ctrl-scroll to zoom.</p>
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
        ) : (
          <p className={treeError ? "zx-error" : "zx-loading"}>{treeError ? `Could not load the computation: ${treeError}.` : "Loading the computation…"}</p>
        )
      ) : (
        <p className="zx-nodetail">
          The computation has been extracted for fourteen certificates so far, and this is not one of them. The numbers above come from this
          certificate in the compiled proof. To see a computation, open <a href="#/6710">certificate 6,710</a>,{" "}
          <a href="#/53">certificate 53</a> or <a href="#/1">certificate 1</a>, or list all fourteen with the “Computation shown” filter.
        </p>
      )}
      <h3 className="zx-section">The two checks</h3>
      <SignChart rows={rows} row={row} onChoose={onChoose} />
      <Ends row={row} neighbours={neighbours} onCompare={setComparison} />
      {comparison !== null && neighbours[comparison] && (
        <EndpointComparison row={row} side={comparison} neighbour={neighbours[comparison]!} onClose={() => setComparison(null)} onChoose={onChoose} />
      )}
      <Variant row={row} />
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
      <p className="zx-end-caption">
        Z̃ is the approximation the certificate computes. Its range comes from exact rational arithmetic in the proof. Adding the error bound on
        both sides gives the range for Z. The margin is how far that range stays from 0. Ranges are rounded outward and margins downward.
      </p>
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

function HoverCard({ card, at }: { card: CertCard; at: [number, number] }) {
  const checks = card.checks.reduce((n, c) => n + c.count, 0);
  return (
    <div className="zx-hover" style={{ left: at[0] + 16, top: at[1] + 16 }} role="tooltip">
      <strong>{card.label}</strong>
      {card.value && <span>in [{card.value.lo}, {card.value.hi}]</span>}
      <span>Proved by <code>{card.head.replace(/^_private\..*\.(_proof_\d+_\d+)$/, "sealed $1").replace(/^(Enclosure|BSN|Zeta\.Certificates)\./, "")}</code>{card.stepCount ? `, after ${card.stepCount} steps on the same value` : ""}</span>
      {card.sealed && <span>Proved once as a separate lemma{card.citedBy > 1 ? `, cited by ${card.citedBy} quantities` : ""}</span>}
      {card.recentred && <span>Re-centred from {card.recentred[0]} digits to {card.recentred[1]}</span>}
      {checks > 0 && <span>{checks} Boolean check{checks > 1 ? "s" : ""} on numerals that the kernel evaluates, the longest numeral {card.kernelLiteralDigits} digits</span>}
      {card.checkExamples[0] && <code className="zx-hover-ex">{shortLiterals(card.checkExamples[0])}</code>}
      {card.digits > 0 && <span>The enclosure is written with {card.digits} digits</span>}
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
        ? "The builder first tries the Riemann–Siegel formula without the C₁ term, and the certificate saved here uses the formula with it. Only 74 of the 10,104 Riemann–Siegel certificates do, always in neighbouring pairs that share an endpoint. "
        : "Riemann–Siegel formula without the C₁ term, the version the builder tries first. "}
      {sameBound
        ? <>Both endpoints use one error bound, proved at t = {row.ends[0].boundAt}, the lowest height in its batch of certificates; the bound decreases with t, so it holds at both endpoints.</>
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
