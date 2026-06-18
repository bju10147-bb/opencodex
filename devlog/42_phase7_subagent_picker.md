# Phase 7 — Subagent model picker (choose the 5 from the GUI)

## Root cause (codex-rs, read-only finding)
`core/src/tools/handlers/multi_agents_spec.rs` →
```rust
const MAX_MODEL_OVERRIDES_IN_SPAWN_AGENT_DESCRIPTION: usize = 5;
fn spawn_agent_models_description(models) {
    models.iter().filter(|m| m.show_in_picker).take(5) ...   // first 5 picker-visible
}
```
- `show_in_picker = (visibility == List)` (protocol/openai_models.rs:477).
- The `model` param is a **free string**, and the handler (`multi_agents_common.rs:307` →
  `find_spawn_agent_model_name`) validates the requested model against the **full** routed
  catalog — so **every routed model is already callable**; only the *advertised list* is capped at 5.
- Native gpt is excluded from the subagent list; the 5 shown = **first 5 routed entries in catalog order**
  (observed: opencode-go/minimax-m3 … = exactly the catalog's leading routed slugs).

**⇒ The lever opencodex controls = the ORDER of routed entries in the injected catalog.**
We do NOT patch codex-rs and we do NOT change `visibility` (that would also hide models from the
main `/model` picker). We only reorder.

## What we build (opencodex side, GUI + catalog)
User picks up to 5 "featured subagent models" in the GUI → opencodex writes them to config and
re-injects the catalog with those entries **first** → Codex's `take(5)` advertises exactly them.

### MODIFY `src/types.ts`
```diff
 export interface OcxConfig {
   port: number;
   providers: Record<string, OcxProviderConfig>;
   defaultProvider: string;
+  /** Up to 5 routed model ids ("<provider>/<model>") featured first as spawn_agent overrides. */
+  subagentModels?: string[];
 }
```

### MODIFY `src/codex-catalog.ts`
In `syncCatalogModels` (and the `/v1/models?client_version` path via `buildCatalogEntries`), after
gathering `goModels`, reorder so the configured `subagentModels` come first **in the user's order**,
remaining routed models after — natives untouched, every routed entry keeps `visibility:"list"`:
```ts
function orderForSubagents(goModels: CatalogModel[], featured: string[] = []): CatalogModel[] {
  if (!featured.length) return goModels;
  const key = (m: CatalogModel) => `${m.provider}/${m.id}`;
  const rank = new Map(featured.map((id, i) => [id, i]));
  return [...goModels].sort((a, b) => {
    const ra = rank.has(key(a)) ? rank.get(key(a))! : Infinity;
    const rb = rank.has(key(b)) ? rank.get(key(b))! : Infinity;
    return ra - rb; // featured (by chosen order) first, stable otherwise
  });
}
```
Apply it to `goModels` before `buildCatalogEntries(...)` in both `syncCatalogModels` and the server's
`/v1/models` branch (thread `config.subagentModels` through).

### MODIFY `src/server.ts`
- `GET /api/subagent-models` → `{ chosen: config.subagentModels ?? [], available: <routed model ids from fetchAllModels> }`
- `PUT /api/subagent-models` body `{ models: string[] }` → validate ≤5 + each is a known routed id,
  save `config.subagentModels`, re-run `syncCatalogModels(config)` so Codex picks it up. Returns `{ ok, applied }`.

### NEW (GUI) — `gui/src/pages/Subagents.tsx` + nav entry in `App.tsx`
A "Subagents" page: lists all routed models (from `/api/models`), lets the user select & order up to 5
(checkbox + up/down or numbered), shows "these 5 appear as spawn_agent overrides in Codex", Save →
`PUT /api/subagent-models`. A small note explains other models are still callable by exact name.

## Verification
- tsc backend + GUI.
- Unit: `orderForSubagents` puts featured first in chosen order; ≤5 + unknown-id validation on PUT.
- Integration: `PUT /api/subagent-models {models:[5 chosen]}` → `GET /v1/models?client_version` shows
  those 5 as the **first routed slugs**; `GET /api/subagent-models` round-trips.
- Live (user, in Codex): after `ocx sync`/restart, spawn_agent advertises exactly the chosen 5.
