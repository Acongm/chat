# Chat v2 Consumer Migration

Stage 1.3 migrates the primary `chat.acongm.com` assistant-ui consumer from the
legacy `/api/chat/threads` protocol to the durable `/api/chats` contract.

Backend tracking:

- Stage 1.2: `Acongm/node-vercel-starter#34`
- Durable backend PR: `Acongm/node-vercel-starter#44`
- Consumer tracking: `Acongm/node-vercel-starter#43`

## Primary request path

Browser code calls the same-origin BFF:

```text
chat.acongm.com
  -> /api/chats
  -> AI_CHATS_UPSTREAM_URL
  -> node-vercel-starter /api/chats
```

`AI_CHATS_UPSTREAM_URL` defaults to:

```text
https://api.acongm.com/api/chats
```

For a frontend preview to exercise Stage 1.3 end to end, configure
`AI_CHATS_UPSTREAM_URL` to a backend deployment that contains Stage 1.2. A green
frontend typecheck/build alone does not prove cross-repository integration.

## Identity

Chat v2 never falls back to `x-client-id` for its primary path.

- authenticated accounts use their Supabase access token;
- guests use `supabase.auth.signInAnonymously()` and therefore also have a real
  `auth.uid()` and Bearer JWT;
- anonymous Supabase users remain visually signed out in the account UI;
- the legacy `claimAnonymousThreads()` function remains compatibility-only and
  is not imported by the real Chat v2 workspace.

Anonymous-to-authenticated identity linking/preservation is **not** claimed by
this stage. It must be proven separately before legacy claim compatibility is
removed globally.

## assistant-ui identity mapping

For each durable generation:

| assistant-ui runtime value | Chat v2 field |
| --- | --- |
| current user message `id` | `clientMessageId` |
| previous message in the active runtime branch | `parentMessageId` |
| `unstable_assistantMessageId` | `assistantMessageId` |
| new `crypto.randomUUID()` | `runId` |
| runtime `abortSignal` | request `AbortSignal` |

`unstable_parentId` is intentionally **not** copied into `parentMessageId`:
it represents the parent of the assistant response (normally the current user),
whereas Chat v2 `parentMessageId` represents the parent of the current user
message.

## Server history is authoritative

Chat v2 does not restore conversation history from local/session storage.

1. Load `GET /api/chats/:id`.
2. Follow `nextCursor` through `GET /api/chats/:id/messages`.
3. Refuse silent truncation beyond the explicit restore safety bound.
4. Select one active branch by walking server `parent_message_id` links from the
   most recently persisted message.
5. Seed assistant-ui using stable `clientMessageId` where present.

Sibling regeneration branches must never be flattened into one model/runtime
history.

## Pagination

Conversation list and message history both consume opaque backend cursors.
Client code does not sort server pages again and deduplicates chat ids when
appending a page.

The hook exposes `hasMore`, `loadingMore`, and `loadMore`. A visible load-more UI
must be wired before this Stage is considered fully product-complete.

## Capability matrix

The code-level `CHAT_V2_CAPABILITIES` constant is the source of truth:

| Capability | Durable server guarantee |
| --- | --- |
| Send | yes |
| Retry idempotency | yes |
| Reload / regenerate | yes |
| Edit branch | yes |
| Cancel | yes |
| Cursor pagination | yes |
| History update/upsert adapter | no |
| History delete adapter | no |
| Resume interrupted run | no |

Do not expose unsupported server behavior merely because LocalRuntime can perform
an equivalent local action.

## CI contracts

`.github/workflows/chat-v2-contracts.yml` runs dependency-free Node 22 contracts
that prove:

- normalized SDK shape;
- active branch reconstruction;
- assistant-ui durable identity mapping;
- the explicit capability matrix;
- Supabase anonymous identity cutover invariants;
- primary source files do not import the legacy thread SDK / claim path;
- the BFF does not forward `x-client-id`.

These contracts complement, rather than replace, the monorepo typecheck/build.
Cross-repository preview E2E and real Supabase RLS execution remain later gates.
