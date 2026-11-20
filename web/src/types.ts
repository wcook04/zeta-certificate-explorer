// The data tools/prepare.py writes. Every number is a decimal string computed from the
// proof's exact integers, rounded outward.

export interface EndCheck {
  /** Interval certified to contain the approximation Z̃ at this end. */
  z: [string, string];
  sign: "+" | "-";
  /** Upper end of the certified error bound. */
  bound: string;
  /** Height at which the bound was proved (the batch's lowest height for Riemann–Siegel). */
  boundAt: string | null;
  /** True Hardy Z: the approximation enclosure widened by the analytic error bound. */
  trueZ: [string, string];
  /** |centre of Z̃| − enclosure radius − error-bound upper end, rounded down. */
  margin: string;
}

export interface Row {
  row: number;
  method: "EM" | "RS";
  batch: number;
  offset: number;
  variant: "EM" | "C0" | "C1";
  left: string;
  right: string;
  params: string[];
  ends: [EndCheck, EndCheck];
  /** Minimum endpoint margin, rounded down again to two significant digits. */
  marginShort: string;
  detail?: boolean;
}

export interface CertCard {
  id: string;
  label: string;
  head: string;
  kind: string;
  subject: string | null;
  statement: string;
  value: { lo: string; hi: string; centre: string; radius: string } | null;
  steps: { head: string; kind: string; statement: string }[];
  stepCount: number;
  checks: { kind: string; head: string; count: number }[];
  checkExamples: string[];
  uses: string[];
  sealed: boolean;
  citedBy: number;
  digits: number;
  recentred: [number, number] | null;
  kernelLiteralDigits: number;
}

export interface TreeStats {
  proofSteps: number;
  kernelChecks: number;
  kernelCheckHeads: [string, number][];
  longestKernelLiteral: number;
  sealedLemmas: number;
  sealedMostCited: number;
  recentrings: number;
  recentringsShortened: number;
  biggestShortening: [number, number] | null;
}

export interface CertTree {
  root: string;
  nodes: CertCard[];
  rawNodes: number;
  row: number;
  method: "EM" | "RS";
  variant: "EM" | "C0" | "C1";
  left: string;
  right: string;
  batch: string;
  offset: number;
  frontier: number[];
  stats: TreeStats;
}

export interface Manifest {
  rows: number;
  detailed: number[];
  variants: Record<string, number>;
  margins_checked: number;
  provenance: Record<string, string>;
  sizes: { row: number; method: "EM" | "RS"; t: string; steps: number; kernelChecks: number; sealed: number }[];
}
