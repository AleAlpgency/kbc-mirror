import { PERSONAS } from "@/lib/data";
import Login from "./login";

export default function Home() {
  const personas = Object.values(PERSONAS).map((p) => ({ id: p.id, name: p.name, age: p.age, segment: p.segment }));
  return (
    <main className="wrap">
      <header className="hero">
        <div className="brand">KBC <span>Mirror</span></div>
        <h1>What does your bank think it knows about you?</h1>
        <p className="lede">
          Every inference KBC holds about you, in one place. Confirm it, correct it, or say no.
          Nudges only go out on what you agreed with. Every answer teaches the bank, for all 2.3 million customers at once.
        </p>
      </header>
      <Login personas={personas} />
      <p className="fine">Proof of concept for the Tectonic Hackathon 2026. All customers and signals are synthetic.</p>
    </main>
  );
}
