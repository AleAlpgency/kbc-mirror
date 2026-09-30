import { PERSONAS } from "./data.ts";
import { infer, NUDGES, type Inference } from "./rules.ts";
import { getState, type Decision, type Budget } from "./store.ts";

export type LedgerItem = Inference & { decision?: Decision; note?: string; nudge: string };

export type Ledger = {
  customer: { id: string; name: string; age: number; segment: string };
  items: LedgerItem[];
  budget: Budget;
  queue: { situation: string; text: string; reason: string }[];
  held: { situation: string; text: string; reason: string }[];
  labels: number;
};

export function buildLedger(customerId: keyof typeof PERSONAS): Ledger {
  const c = PERSONAS[customerId];
  const s = getState(customerId);
  const items: LedgerItem[] = infer(c).map((inf) => {
    const d = s.decisions.get(inf.id);
    return { ...inf, decision: d?.decision, note: d?.note, nudge: NUDGES[inf.situation] };
  });

  // Nudges: only confirmed inferences, or unreviewed ones we are very sure about. Never vetoed or corrected ones.
  const eligible = items.filter((i) => i.decision === "confirmed" || (!i.decision && i.confidence >= 0.8));
  const queue: Ledger["queue"] = [];
  const held: Ledger["held"] = [];
  for (const i of items) {
    if (i.decision === "vetoed") held.push({ situation: i.label, text: i.nudge, reason: "You said no. Nothing goes out." });
    else if (i.decision === "corrected") held.push({ situation: i.label, text: i.nudge, reason: `You corrected this: "${i.note ?? ""}". Re-scored, not sent.` });
    else if (!eligible.includes(i)) held.push({ situation: i.label, text: i.nudge, reason: `Confidence ${i.confidence} is below 0.8 and you have not confirmed it.` });
  }
  const sorted = eligible.sort((a, b) => (a.decision === "confirmed" ? -1 : 1) - (b.decision === "confirmed" ? -1 : 1) || b.confidence - a.confidence);
  sorted.forEach((i, idx) => {
    if (idx < s.budget.perWeek) queue.push({ situation: i.label, text: i.nudge, reason: i.decision === "confirmed" ? `You confirmed it. Sent ${s.budget.window}.` : `Confidence ${i.confidence}. Sent ${s.budget.window} unless you veto.` });
    else held.push({ situation: i.label, text: i.nudge, reason: `Over your budget of ${s.budget.perWeek} a week. Waits for next week.` });
  });

  return { customer: { id: c.id, name: c.name, age: c.age, segment: c.segment }, items, budget: s.budget, queue, held, labels: s.decisions.size };
}

export function ownsInference(customerId: string, inferenceId: string): boolean {
  return inferenceId.startsWith(`${customerId}:`);
}
