"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type P = { id: string; name: string; age: number; segment: string };

export default function Login({ personas }: { personas: P[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function pick(id: string) {
    setBusy(id);
    const r = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ persona: id }) });
    if (r.ok) router.push("/mirror");
    else setBusy(null);
  }
  return (
    <section className="personas">
      <div className="label">Sign in as a synthetic customer</div>
      <div className="grid">
        {personas.map((p) => (
          <button key={p.id} className="persona" onClick={() => pick(p.id)} disabled={busy !== null}>
            <span className="avatar">{p.name.split(" ").map((s) => s[0]).join("")}</span>
            <span className="pname">{p.name}, {p.age}</span>
            <span className="pseg">{p.segment}</span>
            <span className="cta">{busy === p.id ? "Opening" : "Open my mirror"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
