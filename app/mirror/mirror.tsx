"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Ledger } from "@/lib/ledger";
import type { ScaleReport } from "@/lib/scale";

const json = { "content-type": "application/json" };

export default function Mirror() {
  const router = useRouter();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [scale, setScale] = useState<ScaleReport | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/ledger").then(async (r) => (r.ok ? setLedger(await r.json()) : router.push("/")));
  }, [router]);

  async function decide(inferenceId: string, decision: "confirmed" | "corrected" | "vetoed", n?: string) {
    const r = await fetch("/api/decision", { method: "POST", headers: json, body: JSON.stringify({ inferenceId, decision, note: n }) });
    if (r.ok) setLedger(await r.json());
    setEditing(null);
    setNote("");
  }
  async function budget(perWeek: number, window: string) {
    const r = await fetch("/api/budget", { method: "POST", headers: json, body: JSON.stringify({ perWeek, window }) });
    if (r.ok) setLedger(await r.json());
  }
  async function run() {
    setRunning(true);
    const r = await fetch("/api/scale");
    if (r.ok) setScale(await r.json());
    setRunning(false);
  }
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
  }

  if (!ledger) return <main className="wrap"><p className="fine">Loading your mirror</p></main>;

  return (
    <main className="wrap">
      <header className="bar">
        <div className="brand">KBC <span>Mirror</span></div>
        <div className="who">{ledger.customer.name} · {ledger.customer.segment} <button className="link" onClick={logout}>Sign out</button></div>
      </header>

      <section>
        <h2>What we think about you right now</h2>
        <p className="sub">{ledger.items.length} inferences. You have answered {ledger.labels}. Each answer is a label the bank learns from.</p>
        <div className="cards">
          {ledger.items.map((i) => (
            <article key={i.id} className={`card ${i.decision ?? ""}`}>
              <div className="top">
                <h3>{i.label}</h3>
                <div className="conf"><div className="bar-bg"><div className="bar-fg" style={{ width: `${i.confidence * 100}%` }} /></div><span>{Math.round(i.confidence * 100)}% sure</span></div>
              </div>
              <p className="why">{i.why}</p>
              <ul className="evidence">{i.evidence.map((e) => <li key={e.kind}>{e.text} <em>{e.daysAgo === 0 ? "today" : `${e.daysAgo}d ago`}</em></li>)}</ul>
              <p className="nudge">If true, we would suggest: <strong>{i.nudge}</strong></p>
              {i.decision ? (
                <div className={`status ${i.decision}`}>
                  {i.decision === "confirmed" && "You confirmed this."}
                  {i.decision === "vetoed" && "You said no. Nothing goes out, and the rule learns."}
                  {i.decision === "corrected" && <>You corrected it: &ldquo;{i.note}&rdquo;</>}
                  <button className="link" onClick={() => decide(i.id, i.decision === "confirmed" ? "vetoed" : "confirmed")}>undo</button>
                </div>
              ) : editing === i.id ? (
                <form className="correct" onSubmit={(e) => { e.preventDefault(); if (note.trim()) decide(i.id, "corrected", note); }}>
                  <input autoFocus maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is actually going on?" />
                  <button type="submit">Save</button>
                  <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              ) : (
                <div className="actions">
                  <button className="yes" onClick={() => decide(i.id, "confirmed")}>Yes, that is right</button>
                  <button className="fix" onClick={() => setEditing(i.id)}>Not quite</button>
                  <button className="no" onClick={() => decide(i.id, "vetoed")}>No</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="two">
        <div>
          <h2>How often may we reach out?</h2>
          <div className="budget">
            <label>At most <input type="number" min={0} max={7} value={ledger.budget.perWeek} onChange={(e) => budget(Number(e.target.value), ledger.budget.window)} /> a week,</label>
            <select value={ledger.budget.window} onChange={(e) => budget(ledger.budget.perWeek, e.target.value)}>
              <option value="mornings">in the morning</option>
              <option value="evenings">in the evening</option>
              <option value="weekends">at the weekend</option>
            </select>
          </div>
        </div>
        <div>
          <h2>What actually goes out</h2>
          {ledger.queue.length === 0 && <p className="sub">Nothing. No inference has your yes, and none is sure enough to go without it.</p>}
          <ul className="queue">
            {ledger.queue.map((q) => <li key={q.situation} className="go"><strong>{q.text}</strong><span>{q.situation}. {q.reason}</span></li>)}
            {ledger.held.map((q) => <li key={q.situation + q.reason} className="hold"><strong>{q.text}</strong><span>{q.situation}. {q.reason}</span></li>)}
          </ul>
        </div>
      </section>

      <section className="scale">
        <h2>Now do it for everyone</h2>
        <p className="sub">One round of the flywheel on a synthetic population of 2,000 customers. Their answers re-weight the rules for all of them. Simulation, not a measured result.</p>
        <button className="run" onClick={run} disabled={running}>{running ? "Running" : "Run over 2,000 customers"}</button>
        {scale && (
          <div className="report">
            <div className="stats">
              <div><span>Before</span><b>{scale.before.precision}%</b><small>precision, {scale.before.fired} nudges fired, {scale.before.recall}% recall</small></div>
              <div><span>Labels collected</span><b>{scale.labels.confirmed + scale.labels.corrected + scale.labels.vetoed}</b><small>{scale.labels.confirmed} yes, {scale.labels.corrected} corrected, {scale.labels.vetoed} no</small></div>
              <div><span>After one round</span><b>{scale.after.precision}%</b><small>precision, {scale.after.fired} nudges fired, {scale.after.recall}% recall</small></div>
            </div>
            <table>
              <thead><tr><th>Rule</th><th>Veto rate</th><th>New weight</th></tr></thead>
              <tbody>{scale.perRule.map((r) => <tr key={r.situation}><td>{r.situation.replace("_", " ").toLowerCase()}</td><td>{r.vetoRate}%</td><td>{r.weight}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
