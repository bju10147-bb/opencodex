# opencodex (ocx)

Universal provider proxy for [OpenAI Codex](https://openai.com/codex) — use **any LLM** with Codex CLI, App, and SDK.

Codex only speaks the Responses API (`/v1/responses`). opencodex sits between Codex and your LLM provider, translating protocols on the fly.

```
Codex CLI/App/SDK → /v1/responses → opencodex → Any Provider
                                         ↓
                              Anthropic · Google · OpenRouter
                              Groq · Ollama · Azure · OpenAI
```

## Quick Start

```bash
# Install
bun install -g opencodex

# Interactive setup (creates config + injects into Codex)
ocx init

# Start the proxy
ocx start

# Use Codex normally — it routes through opencodex
codex "Write a hello world in Python"
```

## Supported Providers

| Provider | Adapter | Protocol |
|----------|---------|----------|
| OpenAI | `openai-responses` | Responses API (passthrough) |
| Anthropic | `anthropic` | Messages API |
| Google Gemini | `google` | Generative AI REST |
| Azure OpenAI | `azure-openai` | Responses API + Azure auth |
| OpenCode Go | `openai-chat` | Chat Completions |
| OpenRouter | `openai-chat` | Chat Completions |
| Groq | `openai-chat` | Chat Completions |
| Ollama | `openai-chat` | Chat Completions |
| LM Studio | `openai-chat` | Chat Completions |
| vLLM | `openai-chat` | Chat Completions |
| Any OpenAI-compatible | `openai-chat` | Chat Completions |

## CLI Commands

```bash
ocx init                    # Interactive setup
ocx start [--port 10100]    # Start proxy
ocx stop                    # Stop proxy
ocx status                  # Check proxy status
ocx gui                     # Open web dashboard
```

## Configuration

Config lives at `~/.opencodex/config.json`:

```json
{
  "port": 10100,
  "providers": {
    "anthropic": {
      "adapter": "anthropic",
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "sk-ant-...",
      "defaultModel": "claude-sonnet-4-20250514"
    },
    "opencode-go": {
      "adapter": "openai-chat",
      "baseUrl": "https://opencode.ai/zen/go/v1",
      "apiKey": "sk-...",
      "defaultModel": "kimi-k2.5"
    }
  },
  "defaultProvider": "anthropic"
}
```

`ocx init` automatically adds to your Codex config:

```toml
# ~/.codex/config.toml
model_provider = "opencodex"

[model_providers.opencodex]
base_url = "http://localhost:10100/v1"
wire_api = "responses"
```

## Model Routing

opencodex automatically routes models to the right provider:

- `claude-*` → `anthropic` adapter
- `gpt-*`, `o1-*`, `o3-*` → `openai` adapter
- `gemini-*` → `google` adapter
- Other models → default provider

## Web Dashboard

```bash
# Start proxy first
ocx start

# In another terminal, start the GUI dev server
cd gui && bun dev
```

Dashboard features:
- Real-time proxy status and uptime
- Provider management (add/edit/remove)
- Request log viewer with auto-refresh

## Architecture

```
src/
├── cli.ts              # CLI entry (ocx command)
├── server.ts           # Bun.serve + routing + management API
├── router.ts           # Model → provider routing
├── config.ts           # Config management + PID
├── bridge.ts           # AdapterEvent → Responses SSE
├── init.ts             # Interactive setup
├── codex-inject.ts     # Codex config.toml injection
├── types.ts            # Core types
├── responses/
│   ├── parser.ts       # Responses API → internal context
│   └── schema.ts       # Zod validation schemas
└── adapters/
    ├── base.ts         # Adapter interface
    ├── openai-chat.ts  # Chat Completions (Tier 1)
    ├── anthropic.ts    # Anthropic Messages
    ├── google.ts       # Google Generative AI
    ├── azure.ts        # Azure OpenAI
    └── openai-responses.ts  # Passthrough
```

## Development

```bash
git clone https://github.com/user/opencodex.git
cd opencodex
bun install
bun run dev     # Start proxy in dev mode
```

## License

MIT
