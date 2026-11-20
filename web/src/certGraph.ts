// A certificate's computation as the map engine's ArgGraph. Adapted from Proof Reader's
// model/fromEdition.ts (editionGraph): the same record shape, with cards for the quantities a
// certificate encloses instead of Lean declarations.

import type { ArgEdge, ArgGraph, ArgNode } from "./model/graph";
import type { CertCard, CertTree } from "./types";

const LEAN = { family: "lean", label: "Lean", slot: 3 as const, place: null, locator: null, url: null };

/** The small word above a card's title: the certified value, shortened for the tile. */
export function shortValue(card: CertCard): string | undefined {
  const v = card.value;
  if (!v) return undefined;
  const c = Number(v.centre);
  const r = Number(v.radius);
  if (!Number.isFinite(c)) return undefined;
  const digits = r === 0 ? 8 : Math.max(2, Math.min(8, Math.ceil(-Math.log10(r)) + 1));
  const text = Math.abs(c) >= 1e-3 && Math.abs(c) < 1e7 ? c.toPrecision(Math.max(digits, 3)) : c.toExponential(4);
  return `≈ ${text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")}`;
}

export function certGraph(tree: CertTree): ArgGraph {
  const goal = tree.root;
  const nodes = new Map<string, ArgNode>();
  const blank = { papers: {}, region: goal, passedExtraction: true };
  for (const card of tree.nodes) {
    nodes.set(card.id, {
      ...blank,
      id: card.id,
      ref: card.id,
      kind: "claim",
      label: card.id === goal || !card.value ? card.label : `${card.label} ${shortValue(card)}`,
      shape: card.value ? "definition" : "theorem",
      status: "kernel_checked",
      origin: LEAN,
    });
  }
  const edges: ArgEdge[] = [];
  for (const card of tree.nodes) {
    for (const to of card.uses) {
      if (!nodes.has(to)) continue;
      edges.push({ key: `${card.id}→${to}→supports`, from: card.id, to, kind: "supports", linkIds: [`${card.id}→${to}`], scoped: false, semanticClass: "supports" });
    }
  }
  const out = new Map<string, ArgEdge[]>();
  const into = new Map<string, ArgEdge[]>();
  for (const id of nodes.keys()) {
    out.set(id, []);
    into.set(id, []);
  }
  for (const e of edges) {
    out.get(e.from)!.push(e);
    into.get(e.to)!.push(e);
  }
  const members = [...nodes.keys()];
  return {
    origins: [{ family: "lean", label: "Lean", slot: 3, count: members.length }],
    cites: [],
    nodes,
    order: members,
    edges,
    out,
    in: into,
    regions: [{ id: goal, title: "The certificate", goal, members }],
    regionOf: new Map(members.map((id) => [id, goal])),
    goals: [goal],
    cyclic: new Set(),
    boundaries: new Map(),
  };
}
