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
  { id: "c1", label: "Needed the C₁ term", test: (r) => r.variant === "C1" },
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
          Salvatore Mercuri and Bhavik Mehta's <a href={REPO}>Lean verification</a> proves that every zero of the Riemann zeta function
          with imaginary part below 10,011 lies on the critical line. It rests on {rows ? fmt(rows.length) : "10,156"} intervals of height,
          each certified to contain a zero, and Turing's method to show there are no others. This page lists every interval and, for
          some, opens the computation Lean checked.
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
          {current ? <Detail row={current} /> : <Welcome rows={rows} onChoose={choose} />}
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
        between.
      </p>
      {rows && (
        <ul className="zx-starts">
          <li><button type="button" onClick={() => onChoose(53)}>The first Riemann–Siegel interval, 149.500 to 150.503</button></li>
          <li><button type="button" onClick={() => onChoose(6710)}>An interval that needed the C₁ correction term, near 7005</button></li>
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
        <span role="columnheader">Zero</span>
        <span role="columnheader">Interval of height t</span>
        <span role="columnheader">Formula</span>
        <span role="columnheader" title="How far |Z̃| clears the error bound, at the closer end">Margin</span>
      </div>
      <div className="zx-scroll" ref={box} onScroll={(e) => setTop(e.currentTarget.scrollTop)}>
        <div style={{ height: rows.length * ROW_H, position: "relative" }}>
          {rows.slice(first, last).map((r, k) => {
            const m = Math.min(Number(r.ends[0].margin), Number(r.ends[1].margin));
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
                  {m.toPrecision(2)}
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

function Detail({ row }: { row: Row }) {
  const [tree, setTree] = useState<CertTree | null>(null);
  const [card, setCard] = useState<string | null>(null);
  useEffect(() => {
    setTree(null);
    setCard(null);
    if (!row.detail) return;
    let live = true;
    fetch(`${DATA}/trees/${row.row}.json`).then((r) => r.json()).then((t) => live && setTree(t as CertTree));
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
  }, [graph]);

  return (
    <div className="zx-cert">
      <h2>
        Zero {fmt(row.row)}: between t = {row.left} and t = {row.right}
      </h2>
      <Ends row={row} />
      <Variant row={row} />
      {row.detail ? (
        graph && tree ? (
          <div className="zx-work">
            <div className="zx-map">
              <p className="zx-map-note">
                The computation Lean checked, read from the compiled proof: {fmt(tree.nodes.length)} cards for {fmt(tree.rawNodes)} proof steps.
                Each card is a quantity, with the value it is proved to be near. Unfold a card to see what it is built from; a value used
                twice is drawn once, with both uses.
              </p>
              <ArgumentTree
                key={tree.row}
                ref={view}
                graph={graph}
                goal={tree.root}
                insets={INSETS}
                persist={false}
                mode="steps"
                oneCardEach
                fitMax={window.innerWidth >= 2000 ? 2 : 1.4}
                rootLabel={`Zero ${fmt(tree.row)}`}
                selected={card ?? undefined}
                onSelect={setCard}
                onTrace={noTrace}
              />
            </div>
            <Inspector card={card ? byId.get(card) ?? null : null} />
          </div>
        ) : (
          <p className="zx-loading">Loading the computation…</p>
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

function Ends({ row }: { row: Row }) {
  const t = [row.left, row.right];
  return (
    <table className="zx-ends">
      <thead>
        <tr>
          <th scope="col">t</th>
          <th scope="col">Z̃(t) lies in</th>
          <th scope="col">Error bound at most</th>
          <th scope="col">Left over</th>
        </tr>
      </thead>
      <tbody>
        {row.ends.map((e, i) => (
          <tr key={i}>
            <th scope="row">{t[i]}</th>
            <td className={e.sign === "+" ? "is-pos" : "is-neg"}>
              [{e.z[0]}, {e.z[1]}]
            </td>
            <td>
              {e.bound}
              {e.boundAt && e.boundAt !== t[i] && <span className="zx-at"> proved at t = {e.boundAt}</span>}
            </td>
            <td>{e.margin}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Variant({ row }: { row: Row }) {
  if (row.method === "EM")
    return (
      <p className="zx-variant">
        Below t = 149.5 the approximation is the Euler–Maclaurin formula, here with cutoffs {row.params[0]} and {row.params[1]} and{" "}
        {row.params[2]} Bernoulli terms at the two ends. The error bound is proved at each end.
      </p>
    );
  return (
    <p className="zx-variant">
      {row.variant === "C1" ? (
        <>
          The builder tries the Riemann–Siegel formula without its first correction term C₁ first. For this interval that did not go through,
          so the certificate uses the formula with C₁, whose error bound is smaller. 74 of the 10,104 Riemann–Siegel intervals needed it,
          always two neighbours sharing an end.{" "}
        </>
      ) : (
        <>Riemann–Siegel formula without the correction term C₁, which the builder tries first. </>
      )}
      Usually one error bound is proved per batch of 200 intervals, at the batch's lowest height, and covers every height above it in
      the batch; at 38 of the 20,208 Riemann–Siegel endpoints it is proved at the endpoint itself. The table says where each bound used
      here was proved.
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
