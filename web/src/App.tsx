import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArgumentTree, type MapViewHandle } from "./map/ArgumentTree";
import { certGraph } from "./certGraph";
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
      <header className="zx-head">
        <h1>Zero certificates up to height 10,011</h1>
        <p className="zx-lede">
          Salvatore Mercuri and Bhavik Mehta's <a href={REPO}>Lean verification</a> proves that every nontrivial zero with
          |Im(s)| &lt; 10,011 lies on the critical line. Explore the {rows ? fmt(rows.length) : "10,156"} certified intervals used in that
          proof: inspect both endpoint checks, compare a shared endpoint, or open one of the fourteen extracted computations.
        </p>
      </header>

      {error && <p className="zx-error">Could not load the data: {error}</p>}

      <main className="zx-main">
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
          The verification, its Lean and its data are Salvatore Mercuri and Bhavik Mehta's (<a href={REPO}>smmercuri/zeta</a>, Apache-2.0),
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
        Each certificate shows two things at the ends of its interval: the approximation Z̃ of Hardy's Z function has opposite signs, and at
        each end |Z̃| is larger than the proved bound on the approximation's error. So Z itself changes sign, and ζ(½ + it) has a zero in
        between. A certificate proves existence inside its bracket; Turing's method supplies the global count.
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
                <span className="zx-t">{r.left} – {r.right}</span>
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
  // Frame the certificate's first row once the tree has laid out in its box.
  useEffect(() => {
    if (!graph) return;
    const t = window.setTimeout(() => view.current?.fitAll(false), 120);
    return () => window.clearTimeout(t);
  }, [graph, focus]);
  const jumpCards = tree ? [
    { label: "Left approximation", card: tree.nodes.find((n) => n.value && n.label === "Z̃ at the left end") },
    { label: "Right approximation", card: tree.nodes.find((n) => n.value && n.label === "Z̃ at the right end") },
    { label: "Error bound", card: tree.nodes.find((n) => n.value && n.label.startsWith("error bound")) },
  ].filter((x) => !!x.card) : [];

  return (
    <div className="zx-cert">
      <div className="zx-row-nav">
        <span>Interval {fmt(row.row)} · {VARIANT_WORDS[row.variant]}</span>
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
            <div className="zx-map">
              <p className="zx-map-note">
                {focus ? "A selected part of the certificate." : "The certificate's proof dependencies."} Unfold a quantity to follow its calculation;
                select it to inspect the enclosure and arithmetic checks. Shared nodes are drawn once. The graph records the successful
                proof, not a timed history of its construction.
              </p>
              <div className="zx-map-jumps" role="group" aria-label="Start from a numerical quantity">
                <button type="button" aria-pressed={!focus} onClick={() => { setFocus(null); setCard(null); }}>Whole certificate</button>
                {jumpCards.map(({ label, card: target }) => <button key={label} type="button" aria-pressed={focus === target!.id} onClick={() => { setFocus(target!.id); setCard(target!.id); }}>{label}</button>)}
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
                onTrace={noTrace}
              />
            </div>
            <Inspector card={card ? byId.get(card) ?? null : null} />
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

function Ends({ row, neighbours, onCompare }: { row: Row; neighbours: readonly (Row | undefined)[]; onCompare(side: 0 | 1): void }) {
  const t = [row.left, row.right];
  return (
    <div className="zx-end-wrap">
      <table className="zx-ends">
        <thead><tr>
          <th scope="col">Endpoint t</th>
          <th scope="col">Approximation Z̃(t)</th>
          <th scope="col">Error at most</th>
          <th scope="col">True Z(t)</th>
          <th scope="col">Distance from 0, at least</th>
        </tr></thead>
        <tbody>{row.ends.map((e, i) => (
          <tr key={i}>
            <th scope="row">
              {t[i]}
              {neighbours[i] && <button type="button" className="zx-compare" onClick={() => onCompare(i as 0 | 1)}>Compare shared end</button>}
            </th>
            <td>[{e.z[0]}, {e.z[1]}]</td>
            <td>{e.bound}</td>
            <td className={e.sign === "+" ? "is-pos" : "is-neg"}>
              <strong>{e.sign === "+" ? "Positive" : "Negative"}</strong>
              {e.trueZ && <span className="zx-range">[{e.trueZ[0]}, {e.trueZ[1]}]</span>}
            </td>
            <td>≥ {e.margin}</td>
          </tr>
        ))}</tbody>
      </table>
      <p className="zx-end-caption">The interval for true Z widens the approximation's enclosure by its analytic error bound. All displayed bounds round outward; distances round down.</p>
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

function Inspector({ card }: { card: CertCard | null }) {
  const box = useRef<HTMLElement>(null);
  // Below the graph (narrower screens), bring the inspector into view when a card is chosen.
  useEffect(() => {
    const el = box.current;
    if (!card || !el) return;
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight - 80) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [card]);
  if (!card)
    return (
      <aside className="zx-inspect zx-inspect--empty">
        <p>Select a card to see the quantity, its proved interval, the lemmas that produced it and the arithmetic the kernel checked.</p>
      </aside>
    );
  const checks = card.checks.reduce((n, c) => n + c.count, 0);
  return (
    <aside className="zx-inspect" aria-live="polite" ref={box}>
      <h3>{card.label}</h3>
      {card.subject && <p className="zx-subject"><code>{card.subject}</code></p>}
      {card.value && (
        <p className="zx-value">
          Proved to lie in <b>[{card.value.lo}, {card.value.hi}]</b>
        </p>
      )}
      {card.kind === "group" && <p className="zx-how">These are separate fields of the certificate, drawn as one card here.</p>}
      {card.head && <p className="zx-how">
        Last step: <code>{card.head.replace(/^_private\..*\.(_proof_\d+_\d+)$/, "$1 (a lemma the builder sealed)")}</code>
        {card.stepCount > 0 && <> after {card.stepCount} earlier step{card.stepCount > 1 ? "s" : ""} on the same value</>}.
      </p>}
      {card.steps.length > 0 && (
        <details>
          <summary>{card.kind === "group" ? "The conditions" : "The steps"}</summary>
          <ol className="zx-steps">
            {card.steps.map((s, i) => (
              <li key={i}>{s.head ? <code>{s.head.replace(/^Enclosure\./, "")}</code> : s.statement}</li>
            ))}
          </ol>
        </details>
      )}
      {checks > 0 && (
        <>
          <h4>What the kernel checks here ({checks})</h4>
          <ul className="zx-checks">
            {card.checks.map((c, i) => (
              <li key={i}>
                {c.count} × <code>{c.head.replace(/^Enclosure\./, "").replace(/^BSN\./, "") || "—"}</code>, {CHECK_WORDS[c.kind] ?? c.kind}
              </li>
            ))}
          </ul>
          {card.checkExamples.length > 0 && (
            <details>
              <summary>An example, as the kernel sees it</summary>
              <pre className="zx-example">{card.checkExamples[0]}</pre>
            </details>
          )}
        </>
      )}
      <details>
        <summary>The statement proved</summary>
        <pre className="zx-example">{card.statement}</pre>
      </details>
    </aside>
  );
}
