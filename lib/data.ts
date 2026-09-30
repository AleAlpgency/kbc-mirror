// Synthetic customers only. No real KBC data anywhere in this repo.

export type Situation = "MOVING" | "NEW_CHILD" | "INCOME_JUMP" | "MORTGAGE_END" | "TRAVEL" | "SIDE_BUSINESS";

export type Signal = { kind: string; text: string; daysAgo: number };

export type Customer = {
  id: string;
  name: string;
  age: number;
  segment: string;
  signals: Signal[];
  /** Hidden ground truth, used only by the scale simulation. Never shown as fact. */
  truth: Situation[];
};

export const SITUATIONS: Situation[] = ["MOVING", "NEW_CHILD", "INCOME_JUMP", "MORTGAGE_END", "TRAVEL", "SIDE_BUSINESS"];

/** Signals that a situation typically produces. The first two are the strong ones. */
export const SIGNAL_LIBRARY: Record<Situation, Signal[]> = {
  MOVING: [
    { kind: "moving.notary", text: "Notary deposit paid", daysAgo: 12 },
    { kind: "moving.address", text: "Address change started in the app", daysAgo: 4 },
    { kind: "moving.furniture", text: "Large furniture purchase", daysAgo: 9 },
    { kind: "moving.mover", text: "Payment to a moving company", daysAgo: 6 },
  ],
  NEW_CHILD: [
    { kind: "child.allowance", text: "Child benefit (Groeipakket) received", daysAgo: 20 },
    { kind: "child.hospital", text: "Maternity ward payment", daysAgo: 35 },
    { kind: "child.retail", text: "Baby retail purchases, 4 in a month", daysAgo: 8 },
    { kind: "child.daycare", text: "Daycare deposit", daysAgo: 15 },
  ],
  INCOME_JUMP: [
    { kind: "income.salary", text: "Monthly income up 28% for 3 months", daysAgo: 2 },
    { kind: "income.newpayer", text: "New recurring payer on the account", daysAgo: 60 },
    { kind: "income.savings", text: "Savings transfers doubled", daysAgo: 10 },
    { kind: "income.coworking", text: "Coworking membership started", daysAgo: 40 },
  ],
  MORTGAGE_END: [
    { kind: "mortgage.last", text: "Mortgage has 5 instalments left", daysAgo: 0 },
    { kind: "mortgage.balance", text: "Outstanding balance below 5%", daysAgo: 0 },
    { kind: "mortgage.lookup", text: "Opened the mortgage overview 3 times this month", daysAgo: 3 },
  ],
  TRAVEL: [
    { kind: "travel.flight", text: "Airline ticket purchased", daysAgo: 14 },
    { kind: "travel.hotel", text: "Hotel booking abroad", daysAgo: 11 },
    { kind: "travel.abroad", text: "Card used outside Belgium", daysAgo: 1 },
    { kind: "travel.currency", text: "Currency exchange", daysAgo: 5 },
  ],
  SIDE_BUSINESS: [
    { kind: "side.platform", text: "Payouts from a marketplace platform", daysAgo: 7 },
    { kind: "side.vat", text: "VAT number search in the app", daysAgo: 21 },
    { kind: "side.tools", text: "Recurring software subscriptions, business tier", daysAgo: 30 },
    { kind: "side.invoice", text: "Invoicing tool subscription", daysAgo: 18 },
  ],
};

/** Three hand-written personas so the demo is deterministic. Ids are opaque on purpose. */
export const PERSONAS: Record<string, Customer> = {
  lien: {
    id: "lien",
    name: "Lien Peeters",
    age: 34,
    segment: "Freelance designer, Ghent",
    truth: ["INCOME_JUMP"],
    signals: [
      SIGNAL_LIBRARY.INCOME_JUMP[0],
      SIGNAL_LIBRARY.INCOME_JUMP[1],
      SIGNAL_LIBRARY.INCOME_JUMP[2],
      // Looks like moving, is actually a renovation.
      SIGNAL_LIBRARY.MOVING[2],
      { kind: "moving.mover", text: "Payment to 'Verhuis & Renovatie BV'", daysAgo: 6 },
      // One card use abroad on a day trip, not a trip.
      SIGNAL_LIBRARY.TRAVEL[2],
      SIGNAL_LIBRARY.TRAVEL[3],
    ],
  },
  tom: {
    id: "tom",
    name: "Tom Janssens",
    age: 58,
    segment: "Teacher, Leuven",
    truth: ["MORTGAGE_END"],
    signals: [
      SIGNAL_LIBRARY.MORTGAGE_END[0],
      SIGNAL_LIBRARY.MORTGAGE_END[1],
      SIGNAL_LIBRARY.MORTGAGE_END[2],
      SIGNAL_LIBRARY.TRAVEL[0],
      SIGNAL_LIBRARY.TRAVEL[1],
    ],
  },
  sara: {
    id: "sara",
    name: "Sara El Amrani",
    age: 26,
    segment: "Nurse, Antwerp",
    truth: ["SIDE_BUSINESS", "NEW_CHILD"],
    signals: [
      SIGNAL_LIBRARY.SIDE_BUSINESS[0],
      SIGNAL_LIBRARY.SIDE_BUSINESS[1],
      SIGNAL_LIBRARY.SIDE_BUSINESS[3],
      SIGNAL_LIBRARY.NEW_CHILD[0],
      SIGNAL_LIBRARY.NEW_CHILD[2],
    ],
  },
};

export function isPersonaId(id: unknown): id is keyof typeof PERSONAS {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(PERSONAS, id);
}

/** Deterministic LCG so the scale run is reproducible. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Synthetic population for the scale panel. Each customer gets true situations plus noise signals. */
export function generatePopulation(n: number, seed = 42): Customer[] {
  const rand = rng(seed);
  const out: Customer[] = [];
  for (let i = 0; i < n; i++) {
    const truth: Situation[] = [];
    const signals: Signal[] = [];
    for (const sit of SITUATIONS) {
      const lib = SIGNAL_LIBRARY[sit];
      if (rand() < 0.12) {
        truth.push(sit);
        const k = 2 + Math.floor(rand() * (lib.length - 1)); // 2..lib.length
        for (let j = 0; j < Math.min(k, lib.length); j++) signals.push(lib[j]);
      } else if (rand() < 0.15) {
        // Noise: one or two weak signals without the situation.
        const k = 1 + (rand() < 0.35 ? 1 : 0);
        for (let j = 0; j < k; j++) signals.push(lib[lib.length - 1 - j]);
      }
    }
    out.push({ id: `c${i}`, name: `Customer ${i}`, age: 20 + Math.floor(rand() * 50), segment: "synthetic", signals, truth });
  }
  return out;
}
