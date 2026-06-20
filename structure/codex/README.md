# Codex Integration SOT

## Codex home

`src/codex-paths.ts` resolves Codex state from `CODEX_HOME` when set and valid, otherwise from
`~/.codex`. The managed files are:

```text
$CODEX_HOME/config.toml
$CODEX_HOME/opencodex.config.toml
$CODEX_HOME/opencodex-catalog.json
$CODEX_HOME/models_cache.json
```

Never assume macOS-only paths. Windows, service installs, and app-launched Codex can all depend on
the resolved `CODEX_HOME`.

## Config injection

`src/codex-inject.ts` inserts root-level keys and an opencodex provider table:

```toml
model_provider = "opencodex"
model_catalog_json = "/absolute/path/to/opencodex-catalog.json"

[model_providers.opencodex]
name = "OpenCodex Proxy"
base_url = "http://localhost:10100/v1"
wire_api = "responses"
requires_openai_auth = true
```

Root TOML keys must be written before the first `[table]`. Re-injection strips stale opencodex
blocks, stale root context-window overrides, and stale opencodex catalog paths before rewriting.

`supports_websockets = true` is appended only when `websocketsEnabled(config)` returns true.

## Shared catalog

`src/codex-catalog.ts` builds a shared Codex-shaped catalog for CLI, TUI, App, and SDK. It:

- preserves native OpenAI entries from the live catalog or static fallback;
- clones a native template for routed `provider/model` entries;
- forces strict Codex catalog fields required by the current parser;
- hides `disabledModels`;
- strips native-only service tier and WebSocket metadata unless explicitly enabled;
- backs up the pristine catalog once to `~/.opencodex/catalog-backup.json`;
- invalidates `$CODEX_HOME/models_cache.json` when model visibility changes.

Codex App model picker visibility comes from this shared catalog, not from patching the App.

## Subagents

Codex `spawn_agent` advertises only the highest-priority first five catalog models. `subagentModels`
is capped at five ids and may contain routed `provider/model` slugs or native model slugs. Startup
seeds native GPT defaults only when the field is unset; an explicit empty list persists.

## Restore

`ocx stop`, `ocx restore` / `ocx eject`, `ocx service stop`, and `ocx service uninstall` must strip
opencodex config and routed catalog entries without damaging native Codex state.
