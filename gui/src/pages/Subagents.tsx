import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

export default function Subagents({ apiBase }: { apiBase: string }) {
  const [available, setAvailable] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await fetch(`${apiBase}/api/subagent-models`).then(res => res.json());
      const avail: string[] = r.available ?? [];
      setAvailable(avail);
      setChosen((r.chosen ?? []).filter((m: string) => avail.includes(m)));
    } catch {
      setStatus("Failed to load models — is the proxy running?");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [apiBase]);

  const toggle = (m: string) => {
    setStatus("");
    setChosen(prev => prev.includes(m) ? prev.filter(x => x !== m) : (prev.length >= 5 ? prev : [...prev, m]));
  };
  const move = (i: number, dir: -1 | 1) => {
    setChosen(prev => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const save = async () => {
    setStatus("");
    try {
      const r = await fetch(`${apiBase}/api/subagent-models`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: chosen }),
      });
      const d = await r.json();
      setStatus(r.ok
        ? `✅ Saved ${d.applied?.length ?? 0} models. Start a new Codex session (or run 'ocx sync') to see them as spawn_agent overrides.`
        : (d.error || "Save failed"));
    } catch {
      setStatus("Network error — is the proxy running?");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available.filter(m => !q || m.toLowerCase().includes(q));
  }, [available, query]);

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      <h3 style={{ fontSize: 16, marginTop: 0 }}>Subagent models</h3>
      <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>
        Codex's <code>spawn_agent</code> advertises only the first <b>5</b> routed models as overrides.
        Pick up to 5 here to feature them first — opencodex reorders the catalog so exactly these appear.
        Any other model is still callable by its exact name; this only controls what's shown.
      </p>

      {status && <div style={{ fontSize: 13, color: status.includes("✅") ? "#16a34a" : "#ef4444", margin: "8px 0" }}>{status}</div>}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Featured ({chosen.length}/5)</div>
        {chosen.length === 0 && <div style={{ fontSize: 13, color: "#999" }}>None selected — pick from the list below.</div>}
        {chosen.map((m, i) => (
          <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "6px 10px", marginBottom: 4 }}>
            <span style={{ width: 18, color: "#2563eb", fontWeight: 600 }}>{i + 1}</span>
            <code style={{ flex: 1, fontSize: 13 }}>{m}</code>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={iconBtn}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === chosen.length - 1} style={iconBtn}>↓</button>
            <button onClick={() => toggle(m)} style={{ ...iconBtn, color: "#ef4444" }}>✕</button>
          </div>
        ))}
        <button onClick={save} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, cursor: "pointer" }}>Save</button>
      </div>

      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search routed models…"
        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box", marginBottom: 8 }} />
      <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.map(m => {
          const sel = chosen.includes(m);
          const full = !sel && chosen.length >= 5;
          return (
            <button key={m} onClick={() => toggle(m)} disabled={full}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, border: "1px solid #eee",
                background: sel ? "#eff6ff" : "#fafafa", cursor: full ? "not-allowed" : "pointer", opacity: full ? 0.5 : 1, textAlign: "left", width: "100%" }}>
              <span style={{ width: 16, color: "#2563eb" }}>{sel ? "✓" : ""}</span>
              <code style={{ fontSize: 13 }}>{m}</code>
            </button>
          );
        })}
        {filtered.length === 0 && <div style={{ fontSize: 13, color: "#999", padding: 8 }}>No routed models — log into a provider or add one first.</div>}
      </div>
    </div>
  );
}

const iconBtn: CSSProperties = {
  border: "1px solid #e5e7eb", background: "#fff", borderRadius: 4, cursor: "pointer", fontSize: 12, padding: "2px 6px", color: "#555",
};
