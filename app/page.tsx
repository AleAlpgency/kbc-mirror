import { PERSONAS } from "@/lib/data";
import { infer } from "@/lib/rules";
import Login from "./login";

export default function Home() {
  const personas = Object.values(PERSONAS).map((p) => ({ id: p.id, name: p.name, age: p.age, segment: p.segment }));
  const preview = infer(PERSONAS.lien)[1];
  return (
    <main className="wrap home">
      <header className="bar home-bar">
        <a className="brand" href="/"><img src="/brand/kbc.svg" alt="KBC" height={30} /><span>Mirror</span></a>
        <span className="pill">Proof of concept · Tectonic Hackathon 2026</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <h1>What does your bank think it knows about you?</h1>
          <p className="lede">
            Every inference KBC holds about you, in one place. Confirm it, correct it, or say no.
            Nudges only go out on what you agreed with. Every answer teaches the bank, for all 2.3 million customers at once.
          </p>
          <Login personas={personas} />
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="visual-glow" />
          <article className="card preview">
            <div className="top">
              <h3>{preview.label}</h3>
              <div className="conf"><div className="bar-bg"><div className="bar-fg" style={{ width: `${preview.confidence * 100}%` }} /></div><span>{Math.round(preview.confidence * 100)}% sure</span></div>
            </div>
            <p className="why">{preview.why}</p>
            <ul className="evidence">{preview.evidence.map((e) => <li key={e.kind}>{e.text} <em>{e.daysAgo}d ago</em></li>)}</ul>
            <div className="actions">
              <button className="yes" tabIndex={-1}>Yes, that is right</button>
              <button className="fix" tabIndex={-1}>Not quite</button>
              <button className="no" tabIndex={-1}>No</button>
            </div>
          </article>
          <div className="status corrected preview-status">You corrected it: &ldquo;Renovating, not moving&rdquo;</div>
        </div>
      </section>

      <p className="fine">All customers, signals and portraits are synthetic. No KBC data was used.</p>
    </main>
  );
}
