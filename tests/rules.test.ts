import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAS } from "../lib/data.ts";
import { infer } from "../lib/rules.ts";
import { ownsInference } from "../lib/ledger.ts";
import { runScale } from "../lib/scale.ts";

test("Lien gets income, moving and travel inferences, strongest first", () => {
  const inf = infer(PERSONAS.lien);
  assert.deepEqual(inf.map((i) => i.situation), ["INCOME_JUMP", "MOVING", "TRAVEL"]);
  assert.ok(inf[0].confidence > inf[2].confidence);
});

test("a customer cannot decide on another customer's inference", () => {
  assert.equal(ownsInference("lien", "tom:MORTGAGE_END"), false);
  assert.equal(ownsInference("lien", "lien:MOVING"), true);
});

test("one correction round raises precision on the synthetic population", () => {
  const r = runScale(2000);
  assert.ok(r.after.precision > r.before.precision, `${r.before.precision} -> ${r.after.precision}`);
  assert.ok(r.labels.vetoed > 0);
});
