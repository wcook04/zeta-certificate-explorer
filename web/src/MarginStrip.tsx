// The page's one figure, drawn from its own data: every certified interval as a dot, its height t
// across and, up the side on a log scale, how far |Z̃| clears the error bound at the closer end
// (the table's "margin at least"). Intervals whose certificate uses C₁ and the Euler–Maclaurin
// intervals are marked; the selected interval is ringed. A click opens the nearest interval.

import { useEffect, useMemo, useRef, useState } from "react";

import type { Row } from "./types";

const T_MAX = 10012;
const Y_MIN = -3.8; // just under the smallest margin, 2.7e-4
const Y_MAX = 1.1;
const PAD = { left: 44, right: 26, top: 10, bottom: 24 };

interface Pt { row: number; x: number; y: number; variant: Row["variant"] }

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

export function MarginStrip({ rows, selected, onChoose, height = 168 }: { rows: Row[]; selected: number | null; onChoose(row: number): void; height?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<Pt | null>(null);
  const [scheme, setScheme] = useState(0);

  const pts = useMemo<Pt[]>(() => rows.map((r) => ({
    row: r.row,
    x: (Number(r.left) + Number(r.right)) / 2,
    y: Math.log10(Math.max(Number(r.marginShort), 1e-4)),
    variant: r.variant,
  })), [rows]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const flip = () => setScheme((s) => s + 1);
    mq.addEventListener("change", flip);
    return () => { ro.disconnect(); mq.removeEventListener("change", flip); };
  }, []);

  const sx = (t: number) => PAD.left + (t / T_MAX) * (width - PAD.left - PAD.right);
  const sy = (y: number) => PAD.top + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * (height - PAD.top - PAD.bottom);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, height);
    const ink3 = token("--ink-3");
    const rule = token("--rule");
    const accent = token("--formal");
    const em = token("--lit");
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    g.font = `${Math.round(rem * 0.75)}px ${token("--font-sans")}`;
    g.fillStyle = ink3;
    g.strokeStyle = rule;
    g.lineWidth = 1;
    for (let k = -3; k <= 1; k++) {
      const y = Math.round(sy(k)) + 0.5;
      g.beginPath(); g.moveTo(PAD.left, y); g.lineTo(width - PAD.right, y); g.stroke();
      g.textAlign = "right"; g.textBaseline = "middle";
      g.fillText(k === 0 ? "1" : k === 1 ? "10" : `10${"⁻¹⁻²⁻³⁻⁴".slice((-k - 1) * 2, (-k) * 2)}`, PAD.left - 6, y);
    }
    g.textAlign = "center"; g.textBaseline = "top";
    for (let t = 0; t <= 10000; t += 2000) g.fillText(t === 0 ? "t = 0" : t.toLocaleString("en-GB"), sx(t), height - PAD.bottom + 6);
    // ordinary intervals first, marked ones on top
    g.globalAlpha = 0.45;
    g.fillStyle = ink3;
    for (const p of pts) if (p.variant === "C0") g.fillRect(sx(p.x) - 0.9, sy(p.y) - 0.9, 1.8, 1.8);
    g.globalAlpha = 1;
    g.fillStyle = em;
    for (const p of pts) if (p.variant === "EM") { g.beginPath(); g.arc(sx(p.x), sy(p.y), 2.6, 0, 7); g.fill(); }
    g.fillStyle = accent;
    for (const p of pts) if (p.variant === "C1") { g.beginPath(); g.arc(sx(p.x), sy(p.y), 3, 0, 7); g.fill(); }
    const sel = selected ? pts[selected - 1] : undefined;
    if (sel) {
      g.strokeStyle = token("--ink");
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(sx(sel.x), sy(sel.y), 7, 0, 7); g.stroke();
      const label = `#${sel.row.toLocaleString("en-GB")}`;
      g.font = `600 ${Math.round(rem * 0.85)}px ${token("--font-sans")}`;
      const right = sx(sel.x) > width - 90;
      g.textAlign = right ? "right" : "left"; g.textBaseline = "middle";
      g.lineWidth = 4; g.strokeStyle = token("--surface"); g.lineJoin = "round";
      const lx = sx(sel.x) + (right ? -12 : 12), ly = sy(sel.y);
      g.strokeText(label, lx, ly);
      g.fillStyle = token("--ink");
      g.fillText(label, lx, ly);
    }
  }, [pts, width, height, selected, scheme]);

  function nearest(e: React.MouseEvent<HTMLCanvasElement>): Pt | null {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    let best: Pt | null = null;
    let d = 14 * 14;
    for (const p of pts) {
      const dx = sx(p.x) - px;
      if (dx > 14 || dx < -14) continue;
      const dy = sy(p.y) - py;
      const q = dx * dx + dy * dy;
      if (q < d) { d = q; best = p; }
    }
    return best;
  }

  const hovered = hover ? rows[hover.row - 1] : null;
  return (
    <figure className="zx-fig">
      <div className="zx-fig-plot" ref={box}>
        <canvas
          ref={canvas}
          style={{ width: "100%", height }}
          role="img"
          aria-label="Every certified interval plotted by height and by how far it clears its error bound; intervals whose certificate uses C1 are marked."
          onPointerMove={(e) => setHover(nearest(e))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => { const p = nearest(e); if (p) onChoose(p.row); }}
          className={hover ? "is-pointing" : undefined}
        />
        {hovered && hover && (
          <div className="zx-fig-tip" style={{ left: Math.min(Math.max(sx(hover.x), 120), width - 120), top: Math.max(sy(hover.y) - 52, 0) }}>
            Certificate {hovered.row.toLocaleString("en-GB")}, t in [{hovered.left}, {hovered.right}]<br />
            margin at least {hovered.marginShort}{hovered.variant === "C1" ? ", uses C₁" : hovered.variant === "EM" ? ", Euler–Maclaurin" : ""}
          </div>
        )}
      </div>
      <figcaption>
        <span><b>All 10,156 certificates.</b> Across: the interval’s height t. Up, on a log scale: how far |Z̃| clears the error bound at the
        tighter end. Click a dot to open it.</span>
        <span className="zx-legend">
          <span><i className="zx-key zx-key--em" /> Euler–Maclaurin, 52</span>
          <span><i className="zx-key zx-key--rs" /> Riemann–Siegel, 10,030</span>
          <span><i className="zx-key zx-key--c1" /> Riemann–Siegel with C₁, 74</span>
        </span>
      </figcaption>
    </figure>
  );
}
