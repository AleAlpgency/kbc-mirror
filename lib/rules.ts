import { SIGNAL_LIBRARY, SITUATIONS, type Customer, type Signal, type Situation } from "./data.ts";

export type Inference = {
  id: string; // `${customerId}:${situation}`
  situation: Situation;
  label: string;
  confidence: number;
  evidence: Signal[];
  why: string;
};

export const LABELS: Record<Situation, string> = {
  MOVING: "About to move house",
  NEW_CHILD: "A child has arrived",
  INCOME_JUMP: "Income is rising",
  MORTGAGE_END: "Mortgage is ending",
  TRAVEL: "Travelling soon",
  SIDE_BUSINESS: "Starting a side business",
};

export const NUDGES: Record<Situation, string> = {
  MOVING: "Home insurance for the new address, and a moving checklist",
  NEW_CHILD: "Open a savings account for the child, check family cover",
  INCOME_JUMP: "Set aside the difference: a monthly investment plan proposal",
  MORTGAGE_END: "Your monthly budget frees up soon. Plan what to do with it",
  TRAVEL: "Activate the card abroad and check travel cover",
  SIDE_BUSINESS: "Separate business account and VAT reminders",
};

/** Per-rule weight, learned from vetoes at population scale. 1 = untouched. */
export type Weights = Record<Situation, number>;
export const DEFAULT_WEIGHTS: Weights = { MOVING: 1, NEW_CHILD: 1, INCOME_JUMP: 1, MORTGAGE_END: 1, TRAVEL: 1, SIDE_BUSINESS: 1 };

export const THRESHOLD = 0.5;

export function infer(c: Customer, weights: Weights = DEFAULT_WEIGHTS): Inference[] {
  const out: Inference[] = [];
  for (const sit of SITUATIONS) {
    const kinds = new Set(SIGNAL_LIBRARY[sit].map((s) => s.kind));
    const evidence = c.signals.filter((s) => kinds.has(s.kind));
    if (evidence.length === 0) continue;
    // Strong signals are the first two in the library. Weak ones add less.
    const strong = evidence.filter((s) => SIGNAL_LIBRARY[sit].slice(0, 2).some((x) => x.kind === s.kind)).length;
    const weak = evidence.length - strong;
    const raw = Math.min(0.98, 0.35 + strong * 0.25 + weak * 0.12);
    const confidence = Math.round(raw * weights[sit] * 100) / 100;
    if (confidence < THRESHOLD) continue;
    out.push({
      id: `${c.id}:${sit}`,
      situation: sit,
      label: LABELS[sit],
      confidence,
      evidence,
      why: `${evidence.length} signal${evidence.length > 1 ? "s" : ""} in the last ${Math.max(...evidence.map((e) => e.daysAgo))} days point to this. ${strong > 0 ? "At least one is a strong signal." : "All of them are weak signals, so we are less sure."}`,
    });
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}
