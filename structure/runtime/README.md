# Runtime SOT

## Entrypoints

| Path | Responsibility |
| --- | --- |
| `src/cli.ts` | `ocx` / `opencodex` CLI: init, start, stop, restore/eject, sync, status, login/logout, gui, service, update. |
| `src/server.ts` | Bun server for `/v1/responses`, `/v1/models`, static GUI, and `/api/*` management endpoints. |
| `src/config.ts` | `~/.opencodex/config.json`, defaults, PID path, env-value resolution, `websocketsEnabled()`. |
| `src/router.ts` | Provider/model selection before adapter dispatch. |
| `src/types.ts` | Shared config, parsed request, adapter, and event types. |

## Lifecycle

`ocx start` refuses a duplicate PID, starts the proxy, writes `~/.opencodex/ocx.pid`, syncs Codex
config/catalog, then serves until shutdown. Normal shutdown restores native Codex. Service mode sets
`OCX_SERVICE=1`, so managed restarts do not repeatedly restore/reinject; explicit service stop and
uninstall still restore.

## Providers and adapters

| Path | Responsibility |
| --- | --- |
| `src/providers/registry.ts` | Canonical provider presets for CLI, dashboard, OAuth, key providers, and metadata. |
| `src/providers/derive.ts` | Enrichment from provider presets into user config. |
| `src/oauth/` | OAuth providers, token storage, refresh, and auth-token resolution. |
| `src/adapters/openai-responses.ts` | Native OpenAI/ChatGPT Responses passthrough. |
| `src/adapters/openai-chat.ts` | OpenAI-compatible Chat Completions bridge. |
| `src/adapters/anthropic.ts` | Anthropic Messages bridge. |
| `src/adapters/google.ts` | Gemini bridge. |
| `src/adapters/azure.ts` | Azure OpenAI bridge. |

Adapter output must stay in internal `AdapterEvent` form until `bridge.ts` converts it back to
Responses SSE or WebSocket frames.

## Dashboard API

The bundled React dashboard is served from `gui/dist` by the same proxy. `ocx gui` starts the proxy
when needed and opens `http://localhost:<port>`.

Management endpoints live in `src/server.ts` under `/api/*`: config get/put, provider CRUD, models,
disabled models, OAuth login/status/logout, key-provider presets, subagent models, and logs. `GET
/api/config` masks API keys; provider writes must not round-trip masked keys as real secrets.
