// In-memory state for the proof of concept. Resets on restart. A real deployment would put this behind the customer's own record.

export type Decision = "confirmed" | "corrected" | "vetoed";
export type Budget = { perWeek: number; window: "mornings" | "evenings" | "weekends" };

type CustomerState = {
  decisions: Map<string, { decision: Decision; note?: string; at: number }>;
  budget: Budget;
};

const state = new Map<string, CustomerState>();

export function getState(customerId: string): CustomerState {
  let s = state.get(customerId);
  if (!s) {
    s = { decisions: new Map(), budget: { perWeek: 2, window: "evenings" } };
    state.set(customerId, s);
  }
  return s;
}
