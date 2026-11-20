// The certificate as a picture: Hardy's Z near the selected interval. Each endpoint is drawn with the
// interval its certificate proves for Z(t) (the approximation's enclosure widened by the error bound),
// on a signed log scale so that 0.003 and 5 fit on one axis. Each certified interval is a bracket on
// the zero line; an interval's endpoint intervals lie on opposite sides of zero, so Z has a zero inside
// the bracket. Neighbouring intervals are drawn too and open on click.

import { useEffect, useMemo, useRef, useState } from "react";

import type { Row } from "./types";

// The vertical axis is Z̃(t) divided by the error bound proved for that endpoint: linear on [−1, 1],
// logarithmic outside it. The certificate's two conditions become: each endpoint lies outside the band
// [−1, 1], and the two endpoints lie on opposite sides of it.
const f = (v: number) => (Math.abs(v) <= 1 ? v : Math.sign(v) * (1 + Math.log10(Math.abs(v))));
const PAD = { left: 64, right: 16, top: 16, bottom: 30 };
const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const tickLabel = (v: number) => {
  if (v === 0) return "0";
  const e = Math.round(Math.log10(Math.abs(v)));
  const s = v < 0 ? "−" : "";
  if (e <= 2) return `${s}${Math.abs(v)}`;
  return `${s}10${String(e).split("").map((d) => SUP[d] ?? d).join("")}`;
};

/** Z̃ / error bound for a label: two significant figures, powers of ten when large. */
function ratio(v: number): string {
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a < 100) return `${s}${a.toPrecision(2).replace(/\.0$/, "")}`;
  if (a < 1000) return `${s}${Math.round(a / 10) * 10}`;
  const e = Math.floor(Math.log10(a));
  return `${s}${(a / 10 ** e).toFixed(1)}×10${String(e).split("").map((d) => SUP[d] ?? d).join("")}`;
}

interface End { t: number; lo: number; hi: number; row: number; side: 0 | 1 }

export function SignChart({ rows, row, onChoose }: { rows: Row[]; row: Row; onChoose(row: number): void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  const [hover, setHover] = useState<number | null>(null);
  const height = 340;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shown = useMemo(() => rows.slice(Math.max(0, row.row - 2), Math.min(rows.length, row.row + 1)), [rows, row]);
  const ends = useMemo<End[]>(() => shown.flatMap((r) => r.ends.map((e, i) => ({
    t: Number(i === 0 ? r.left : r.right),
    lo: Number(e.z[0]) / Number(e.bound), hi: Number(e.z[1]) / Number(e.bound), row: r.row, side: i as 0 | 1,
  }))), [shown]);

  // One equal column per certificate, so a long interval does not crowd out its neighbours.
  const slot = (width - PAD.left - PAD.right) / shown.length;
  const colOf = (r: number) => shown.findIndex((x) => x.row === r);
  const ymax = Math.min(1e30, Math.max(...ends.map((e) => Math.max(Math.abs(e.lo), Math.abs(e.hi)))));
  const Y = f(ymax) + 0.35;
  const sy = (v: number) => PAD.top + (1 - (f(v) + Y) / (2 * Y)) * (height - PAD.top - PAD.bottom);
  const decades = Math.floor(Math.log10(ymax));
  const step = Math.max(1, Math.ceil(decades / 4));
  const ticks = [0, 1, -1, ...Array.from({ length: Math.floor(decades / step) }, (_, k) => 10 ** ((k + 1) * step)).flatMap((v) => [v, -v])];
  const zeroY = sy(0);

  return (
    <figure className="zx-sign">
      <div ref={box} className="zx-sign-plot">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`Z(t) is ${row.ends[0].sign === "+" ? "positive" : "negative"} at t = ${row.left} and ${row.ends[1].sign === "+" ? "positive" : "negative"} at t = ${row.right}`}>
          <rect x={PAD.left} width={width - PAD.left - PAD.right} y={sy(1)} height={sy(-1) - sy(1)} className="zx-sign-band" />
          {width > 640 && <text x={width - PAD.right - 6} y={sy(1) - 5} textAnchor="end" className="zx-sign-bandlabel">inside the band the sign is not proved</text>}
          <text transform={`translate(12 ${(PAD.top + height - PAD.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="zx-axis">Z̃ ÷ error bound</text>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={sy(v)} y2={sy(v)} className={v === 0 ? "zx-sign-zero" : "zx-sign-grid"} />
              <text x={PAD.left - 8} y={sy(v)} className="zx-sign-tick" textAnchor="end" dominantBaseline="middle">{tickLabel(v)}</text>
            </g>
          ))}
          {shown.map((r) => {
            const x0 = PAD.left + colOf(r.row) * slot, x1 = x0 + slot;
            const sel = r.row === row.row;
            return (
              <g key={r.row} className={`zx-sign-int${sel ? " is-sel" : ""}${hover === r.row ? " is-hover" : ""}`}
                onMouseEnter={() => setHover(r.row)} onMouseLeave={() => setHover(null)} onClick={() => onChoose(r.row)}>
                <rect x={x0} y={PAD.top} width={Math.max(1, x1 - x0)} height={height - PAD.top - PAD.bottom} className="zx-sign-col" />
                <path d={`M${x0 + 0.12 * slot},${zeroY - 6}V${zeroY + 6}M${x0 + 0.12 * slot},${zeroY}H${x0 + 0.88 * slot}M${x0 + 0.88 * slot},${zeroY - 6}V${zeroY + 6}`} className="zx-sign-bracket" />
                <text x={(x0 + x1) / 2} y={height - 10} textAnchor="middle" className="zx-sign-label">#{r.row.toLocaleString("en-GB")}{sel ? "" : ""} {slot > 220 && <tspan className="zx-sign-sub">t ∈ [{r.left}, {r.right}]</tspan>}</text>
              </g>
            );
          })}
          {ends.map((e) => {
            const x = PAD.left + colOf(e.row) * slot + (e.side === 0 ? 0.12 : 0.88) * slot;
            const sel = e.row === row.row;
            const pos = e.lo > 0;
            return (
              <g key={`${e.row}-${e.side}`} className={`zx-sign-end ${pos ? "is-pos" : "is-neg"}${sel ? " is-sel" : ""}`}>
                <line x1={x} x2={x} y1={sy(e.lo)} y2={sy(e.hi)} />
                <line x1={x - 4} x2={x + 4} y1={sy(e.lo)} y2={sy(e.lo)} />
                <line x1={x - 4} x2={x + 4} y1={sy(e.hi)} y2={sy(e.hi)} />
                <circle cx={x} cy={sy((e.lo + e.hi) / 2)} r={sel ? 5 : 3.5} />
                {(sel || slot > 220) && (
                  <text x={x + (e.side === 0 ? 10 : -10)} y={sy((e.lo + e.hi) / 2)} dominantBaseline="middle" textAnchor={e.side === 0 ? "start" : "end"} className="zx-sign-val">
                    {e.side === 0 ? "left " : "right "}{ratio(Math.min(e.lo, e.hi))}{ratio(Math.min(e.lo, e.hi)) === ratio(Math.max(e.lo, e.hi)) ? "" : ` to ${ratio(Math.max(e.lo, e.hi))}`}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption>
        <b>Both endpoints clear the band, on opposite sides.</b> Each bar is the proved range of Z̃ at an endpoint divided by the error bound
        there. A bar wholly outside the band from −1 to 1 fixes the sign of Z at that endpoint, and opposite signs at the two ends put a zero
        between them. The scale is logarithmic outside the band; click a column to open that certificate.
      </figcaption>
    </figure>
  );
}
