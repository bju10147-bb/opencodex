# 10 — Phase 2: Multi-Adapter 계획

> 작성: 2026-06-18 · Phase 2 PABCD

## 목표

Anthropic Messages API + Google Generative AI + OpenAI Responses 패스스루 어댑터 추가.

## Done 기준

1. Codex → ocx → Anthropic Claude 직접 호출 성공 (API 키 필요)
2. Codex → ocx → OpenAI Responses 패스스루 성공
3. config.json에 여러 프로바이더 동시 등록 + 모델별 라우팅

## 접근법

jawcode anthropic.ts는 @anthropic-ai/sdk + 60+ 내부 유틸에 의존하므로 추출 불가.
대신 Anthropic Messages API를 직접 타깃하는 **클린 어댑터**를 작성.

## 파일 변경

```
src/adapters/
├── anthropic.ts              ← NEW (Anthropic Messages API 어댑터)
├── openai-responses.ts       ← NEW (Responses API 패스스루 어댑터)
└── openai-chat.ts            ← 기존 (변경 없음)
src/
├── server.ts                 ← MODIFY (어댑터 레지스트리 확장)
├── config.ts                 ← MODIFY (resolveAdapter 개선)
└── types.ts                  ← 기존 (변경 없음 — AdapterEvent 재사용)
```

## 상세 설계

### 1. `src/adapters/anthropic.ts`

OcxParsedRequest → Anthropic Messages API 변환:

```
OcxContext.systemPrompt → system 파라미터 (string | {type:"text",text}[])
OcxUserMessage → {role:"user", content:[{type:"text",text}]}
OcxAssistantMessage → {role:"assistant", content:[{type:"text",text}|{type:"tool_use",...}]}
OcxToolResultMessage → {role:"user", content:[{type:"tool_result",tool_use_id,content}]}
OcxTool → {name, description, input_schema}
OcxToolCall → {type:"tool_use", id, name, input}
thinking → {type:"thinking", thinking} (extended thinking)
```

Anthropic SSE 파싱:
```
message_start → (초기화)
content_block_start → (블록 타입 확인: text/tool_use/thinking)
content_block_delta → text_delta/input_json_delta/thinking_delta → AdapterEvent
content_block_stop → tool_call_end (if tool_use)
message_delta → stop_reason, usage
message_stop → done
```

### 2. `src/adapters/openai-responses.ts`

패스스루 — 요청을 그대로 전달하고 응답도 그대로 반환.
`bridgeToResponsesSSE` 불필요, 원본 SSE 스트림 직접 반환.

### 3. `src/server.ts` 수정

어댑터 해석을 `resolveAdapter` 함수에서 처리:
```typescript
function resolveAdapter(config: OcxProviderConfig) {
  switch (config.adapter) {
    case "openai-chat": return createOpenAIChatAdapter(config);
    case "anthropic": return createAnthropicAdapter(config);
    case "openai-responses": return createResponsesPassthroughAdapter(config);
    default: throw new Error(`Unknown adapter: ${config.adapter}`);
  }
}
```

패스스루 어댑터일 때는 bridge 건너뛰고 원본 스트림 직접 반환.
