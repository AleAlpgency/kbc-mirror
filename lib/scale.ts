import { generatePopulation, SITUATIONS, type Situation } from "./data.ts";
import { DEFAULT_WEIGHTS, infer, type Weights } from "./rules.ts";
import { rng } from "./data.ts";

export type ScaleReport = {
  customers: number;
  before: { fired: number; correct: number; precision: number; recall: number };
  labels: { confirmed: number; corrected: number; vetoed: number };
  weights: Weights;
  after: { fired: number; correct: number; precision: number; recall: number };
  perRule: { situation: Situation; vetoRate: number; weight: number }[];
};

/**
 * One round of the flywheel on a synthetic population:
 * 1. Fire rules with default weights.
 * 2. Customers react: a false inference is vetoed 70% of the time, a true one confirmed 60% of the time. The rest are corrected or ignored.
 * 3. Veto rate per rule lowers that rule's weight.
 * 4. Fire again. Report precision and recall before and after.
 * This is a simulation on synthetic data. It shows the mechanism, not a measured KBC result.
 */
export function runScale(n = 2000): ScaleReport {
  const pop = generatePopulation(n);
  const rand = rng(7);
  const totalTrue = pop.reduce((a, c) => a + c.truth.length, 0);

  const score = (weights: Weights) => {
    let fired = 0, correct = 0;
    for (const c of pop) for (const inf of infer(c, weights)) { fired++; if (c.truth.includes(inf.situation)) correct++; }
    return { fired, correct, precision: fired ? Math.round((correct / fired) * 1000) / 10 : 0, recall: totalTrue ? Math.round((correct / totalTrue) * 1000) / 10 : 0 };
  };

  const before = score(DEFAULT_WEIGHTS);

  const labels = { confirmed: 0, corrected: 0, vetoed: 0 };
  const vetoes: Record<Situation, number> = { MOVING: 0, NEW_CHILD: 0, INCOME_JUMP: 0, MORTGAGE_END: 0, TRAVEL: 0, SIDE_BUSINESS: 0 };
  const firedBy: Record<Situation, number> = { ...vetoes };
  for (const c of pop) {
    for (const inf of infer(c)) {
      firedBy[inf.situation]++;
      const isTrue = c.truth.includes(inf.situation);
      const r = rand();
      if (!isTrue && r < 0.7) { labels.vetoed++; vetoes[inf.situation]++; }
      else if (!isTrue && r < 0.85) labels.corrected++;
      else if (isTrue && r < 0.6) labels.confirmed++;
    }
  }

  const weights: Weights = { ...DEFAULT_WEIGHTS };
  const perRule = SITUATIONS.map((sit) => {
    const vetoRate = firedBy[sit] ? vetoes[sit] / firedBy[sit] : 0;
    weights[sit] = Math.round((1 - vetoRate * 0.8) * 100) / 100;
    return { situation: sit, vetoRate: Math.round(vetoRate * 1000) / 10, weight: weights[sit] };
  });

  return { customers: n, before, labels, weights, after: score(weights), perRule };
}
