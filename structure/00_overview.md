# opencodex Structure

This folder is the maintainer source of truth for the current system shape. Public user workflows
belong in `docs-site/`; historical investigations belong in `docs/`.

## Reading order

| Folder | Purpose |
| --- | --- |
| [`runtime/`](runtime/) | Process lifecycle, CLI, server endpoints, config, providers, adapters, GUI API. |
| [`codex/`](codex/) | `CODEX_HOME`, config injection, shared catalog, Codex App, subagent ordering. |
| [`transports/`](transports/) | Responses HTTP/SSE, optional WebSocket advertisement, sidecars, native passthrough. |
| [`docs-release/`](docs-release/) | Public docs site, GitHub Pages publishing, release/build ownership. |

## Product boundary

opencodex is a local Responses-compatible proxy for Codex. It does not patch Codex binaries. It
changes local Codex state by writing a provider table and model catalog, then serves:

```text
Codex CLI / TUI / App / SDK
  -> http://localhost:<port>/v1/responses
  -> opencodex routing + adapter bridge
  -> upstream provider
```

The default install keeps native OpenAI/ChatGPT passthrough working through the `openai` forward
provider. Additional providers are routed by explicit `provider/model`, provider model lists, or the
configured `defaultProvider`.

## Local state

| Path | Owner | Notes |
| --- | --- | --- |
| `~/.opencodex/config.json` | opencodex | Main config written by `ocx init` and the dashboard. |
| `~/.opencodex/auth.json` | opencodex | OAuth tokens; not committed. |
| `~/.opencodex/catalog-backup.json` | opencodex | One-time pristine Codex catalog backup for restore. |
| `$CODEX_HOME/config.toml` | Codex, edited by opencodex | Active provider and provider table. |
| `$CODEX_HOME/opencodex.config.toml` | opencodex | Optional profile for explicit Codex opt-in. |
| `$CODEX_HOME/opencodex-catalog.json` | opencodex | Shared native+routed model catalog. |
| `$CODEX_HOME/models_cache.json` | Codex, invalidated by opencodex | Cache invalidated after model/catalog changes. |
| `dist/`, `gui/dist/`, `node_modules/` | generated | Build output/dependencies. |

## Non-negotiable invariants

- `websockets` defaults to `false`; only `true` advertises `supports_websockets`.
- `CODEX_HOME` wins over `~/.codex` when present and valid.
- Root TOML keys such as `model_provider` and `model_catalog_json` must stay before any table.
- Routed model slugs use `provider/model`.
- Codex `spawn_agent` visibility depends on the first five featured catalog entries.
- `ocx stop`, `ocx restore`, and service stop/uninstall must leave native Codex usable.
