"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Ledger } from "@/lib/ledger";
import type { ScaleReport } from "@/lib/scale";

const json = { "content-type": "application/json" };

function PrecisionChart({ before, after }: { before: number; after: number }) {
  const W = 420, rowH = 44, pad = 90;
  const rows = [["Before", before, "#9fb0c6"], ["After", after, "#0097db"]] as const;
  return (
    <svg viewBox={`0 0 ${W} ${rows.length * rowH + 8}`} role="img" aria-label={`Precision before ${before} percent, after ${after} percent`}>
      {rows.map(([name, v, color], i) => {
        const y = i * rowH + 8, w = ((W - pad - 60) * v) / 100;
        return (
          <g key={name}>
            <text x={0} y={y + 20}>{name}</text>
            <rect x={pad} y={y} width={W - pad - 60} height={26} rx={6} fill="rgba(13,42,80,0.06)" />
            <rect x={pad} y={y} width={w} height={26} rx={6} fill={color} />
            <text className="val" x={pad + w + 8} y={y + 18}>{v}%</text>
          </g>
        );
      })}
    </svg>
  );
}

function RulesChart({ rows }: { rows: ScaleReport["perRule"] }) {
  const W = 520, rowH = 30, pad = 130;
  return (
    <svg viewBox={`0 0 ${W} ${rows.length * rowH + 6}`} role="img" aria-label="Veto rate and new weight per rule">
      {rows.map((r, i) => {
        const y = i * rowH + 6, w = ((W - pad - 140) * r.vetoRate) / 100;
        return (
          <g key={r.situation}>
            <text x={0} y={y + 15}>{r.situation.replace("_", " ").toLowerCase()}</text>
            <rect x={pad} y={y} width={W - pad - 140} height={18} rx={5} fill="rgba(13,42,80,0.06)" />
            <rect x={pad} y={y} width={w} height={18} rx={5} fill={r.vetoRate > 25 ? "#d64545" : "#0097db"} />
            <text x={pad + w + 8} y={y + 14}>{r.vetoRate}% vetoed</text>
            <text className="val" x={W - 56} y={y + 14}>w {r.weight}</text>
          </g>
        );
      })}
    </svg>
  );
}

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
    await fetch("/api/logout", { method: "POST", headers: json });
    router.push("/");
  }

  if (!ledger) return <main className="wrap"><p className="fine">Loading your mirror</p></main>;

  return (
    <main className="wrap">
      <header className="bar">
        <a className="brand" href="/"><img src="/brand/kbc.svg" alt="KBC" height={26} /><span>Mirror</span></a>
        <div className="who"><img className="who-avatar" src={`/avatars/${ledger.customer.id}.jpg`} alt="" width={28} height={28} />{ledger.customer.name} · {ledger.customer.segment} <button className="link" onClick={logout}>Sign out</button></div>
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
                  <button className="link" aria-label={`Undo your answer on ${i.label}`} onClick={() => decide(i.id, i.decision === "confirmed" ? "vetoed" : "confirmed")}>undo</button>
                </div>
              ) : editing === i.id ? (
                <form className="correct" onSubmit={(e) => { e.preventDefault(); if (note.trim()) decide(i.id, "corrected", note); }}>
                  <input autoFocus aria-label="Your correction" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is actually going on?" />
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
            <label>At most <input type="number" aria-label="Nudges per week" min={0} max={7} value={ledger.budget.perWeek} onChange={(e) => budget(Number(e.target.value), ledger.budget.window)} /> a week,</label>
            <select aria-label="Preferred time" value={ledger.budget.window} onChange={(e) => budget(ledger.budget.perWeek, e.target.value)}>
              <option value="mornings">in the morning</option>
              <option value="evenings">in the evening</option>
              <option value="weekends">at the weekend</option>
            </select>
          </div>
        </div>
        <div aria-live="polite">
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
        <button className="run" onClick={run} disabled={running} aria-busy={running}>{running ? "Running the flywheel" : "Run over 2,000 customers"}</button>
        {scale && (
          <div className="report" aria-live="polite">
            <div className="stats">
              <div><span>Before</span><b>{scale.before.precision}%</b><small>precision, {scale.before.fired} nudges fired, {scale.before.recall}% recall</small></div>
              <div><span>Labels collected</span><b>{scale.labels.confirmed + scale.labels.corrected + scale.labels.vetoed}</b><small>{scale.labels.confirmed} yes, {scale.labels.corrected} corrected, {scale.labels.vetoed} no</small></div>
              <div><span>After one round</span><b>{scale.after.precision}%</b><small>precision, {scale.after.fired} nudges fired, {scale.after.recall}% recall</small></div>
            </div>
            <div className="charts">
              <div className="chart">
                <h4>Precision of what goes out</h4>
                <p>Share of nudges that matched a real situation, before and after one round of answers.</p>
                <PrecisionChart before={scale.before.precision} after={scale.after.precision} />
              </div>
              <div className="chart">
                <h4>What each rule learned</h4>
                <p>Veto rate per rule, and the weight it gets for the next round.</p>
                <RulesChart rows={scale.perRule} />
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
