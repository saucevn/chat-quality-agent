# Final review fix report — feat/pancake-adapter

Fixes for the 4 merge-blocking findings from the last review of `feat/pancake-adapter`. Each finding is its own commit.

## C1 (Critical) — bot messages were indistinguishable from agent messages to the AI

**File:** `backend/ai/prompts.go`

`FormatChatTranscript` used `SenderType` only as a fallback label when `SenderName` was empty. Bot/automation messages classified by `classifyPancakeSender` as `sender_type="system"` always carry a `SenderName` (Pancake attributes them to `admin_name` or `name`, the same as a real agent), so the fallback never triggered — an automated reply and a hand-typed reply from the same staff account rendered as identical transcript lines. The DB-level rule "bot messages map to `sender_type=system` and don't count toward agent scoring" was therefore never enforced at the AI layer.

Fix, entirely inside `backend/ai/prompts.go` (no changes to `classifyPancakeSender` or any adapter):

1. Added `senderRoleLabel(senderType string) string`, which returns a Vietnamese role annotation:
   - `customer` → `"khách hàng"`
   - `agent` → `"nhân viên"`
   - `system` → `"tin tự động, KHÔNG tính vào đánh giá nhân viên"`
2. `FormatChatTranscript` appends `(role)` to the display label for every message, e.g.:
   - `[09:01] Lan (nhân viên): Dạ giá 200k ạ`
   - `[09:02] Lan (tin tự động, KHÔNG tính vào đánh giá nhân viên): Đơn hàng của bạn đã được xác nhận`

   Even when `SenderName` is identical ("Lan") for an agent message and a bot message sent under that agent's account, the two lines are now textually distinct.
3. `BuildQCPrompt` gained a new `## Vai trò người gửi trong đoạn chat` section explaining the `(vai trò)` annotation and explicitly instructing the AI to treat `nhân viên` as the only entity being scored, and never to use `tin tự động...` lines to score, cite violations against, or praise an agent.

This addresses the issue at the layer described in the brief (`ai/` + prompt construction), not by touching `engine/analyzer.go`'s copy of `SenderType` into `ai.ChatMessage` (that copy was already correct — the information just wasn't being used downstream).

**Tests:** `backend/ai/prompts_c1_test.go` (new file):
- `TestFormatChatTranscriptDistinguishesSenderRoles` — 3 messages (customer/agent/system), agent and system share the same `SenderName`; asserts all three transcript lines differ, the agent line says "nhân viên" and not "tự động", and the system line contains both "tự động" and "không tính".
- `TestBuildQCPromptExplainsSystemRoleExclusion` — asserts the QC system prompt itself explains automated messages and instructs the AI not to score them as agent behavior.

**Known caveat, not introduced by this change:** `backend/ai/prompts_test.go` (pre-existing) calls `BuildQCPrompt(rules)` with 1 argument against the real 2-argument signature `BuildQCPrompt(rulesContent, skipConditions string)`. This is a pre-existing compile-breaking bug in the `ai` package's test suite, called out explicitly in the task as one of two known-broken tests **not** to fix. Because Go compiles all `_test.go` files in a package together, this means `go vet ./ai/...` and `go test ./ai/` both fail to build — my new tests in `prompts_c1_test.go` are correct and complete but cannot execute via `go test ./ai/` until that unrelated pre-existing bug is fixed. I verified `TestFormatChatTranscriptDistinguishesSenderRoles` and `TestBuildQCPromptExplainsSystemRoleExclusion` independently by copying `prompts.go` + `prompts_c1_test.go` into a throwaway sibling package inside the module (`backend/ai_verify_tmp`, deleted immediately after) — both passed. That directory was never committed.

## C2 (Critical) — access tokens leaked into plaintext via transport error messages

**Files:** `backend/channels/redact.go` (new), `backend/channels/pancake.go`, `backend/channels/facebook.go`

`net/http`'s `client.Do` wraps transport failures (DNS errors, connection refused, timeouts) in a `*url.Error`, whose `Error()` string embeds the **full request URL**, query string included. Both Pancake (`page_access_token`) and Facebook (`access_token`) put the token in the query string, so any transport failure produced an error like:

```
pancake: request failed: Get "https://pages.fm/api/.../tags?page_access_token=SECRET_TOKEN_ABC123": dial tcp: no such host
```

which flows: `engine/sync.go` → `updateSyncStatus` → `channels.last_sync_error` (plaintext column) → `db.LogActivity` → `activity_logs.error_message` → `GetChannelSyncHistory` → JSON response → UI. Zalo OA is unaffected (header-based auth).

Fix: added `redactSecrets(msg string) string` in `backend/channels/redact.go`, a package-shared helper using a case-insensitive regex to replace `page_access_token=...` / `access_token=...` query-parameter values with `REDACTED`, stopping at `&`, quotes, or whitespace. Applied it to the `client.Do` error paths in both `pancake.go` (`doRequest`, also applied to the `build request` error path since the token is added to the URL before the request is built) and `facebook.go` (`doRequest`).

**Tests:** `backend/channels/redact_test.go` (new file):
- `TestRedactSecretsStripsTokenValues` — unit tests on the regex helper (mid-query, last-param, uppercase param name, message with no secret passes through unchanged).
- `TestPancakeRequestFailureDoesNotLeakToken` — points a real `PancakeAdapter` at an unresolvable host (`*.invalid` TLD) and calls `HealthCheck`; asserts the returned error does not contain the token. Verified (via a temporary debug log, since removed) that this genuinely exercises the DNS-failure path with the real URL: `pancake: request failed: Get "http://.../tags?page_access_token=REDACTED": dial tcp: lookup ...: no such host`.
- `TestFacebookRequestFailureDoesNotLeakToken` — same shape for `FacebookAdapter.doRequest`.

## I1 (Important) — Pancake silently lost messages on a paginated fetch error

**File:** `backend/channels/pancake.go`

`FetchMessages` did `return nil, err` on any page-fetch error, discarding all messages already collected from earlier successful pages. `engine/sync.go` treats a `FetchMessages` error as non-fatal (logs and `continue`s to the next conversation) but still finishes the whole channel sync with `updateSyncStatus(..., "success", "")`, advancing `last_sync_at`. The next sync's `since` watermark moves past the lost window — messages vanish permanently with no error surfaced. `facebook.go` and `zalo_oa.go` already return `(messages, err)` on the same kind of failure.

Fix: `FetchMessages` now returns `out, err` (the partial slice built so far) instead of `nil, err`, one line changed, matching the other two adapters' contract. Scope kept to `pancake.go` only, per the task — `engine/sync.go`'s own handling of a non-nil `FetchMessages` error (currently also discarding whatever was returned) was explicitly out of scope for this fix and left untouched.

**Test:** `backend/channels/pancake_test.go` — added `TestFetchMessagesReturnsPartialMessagesOnLaterPageError`: stub server returns a full first page (30 messages, success) then an HTTP 500 with no `success` field on the second page; asserts `FetchMessages` returns the 30 first-page messages **and** a non-nil error.

## I5 (Important) — Pancake channel could be created with empty credentials

**File:** `backend/api/handlers/channels.go`

`CreateChannelRequest.Credentials` only checked presence (`binding:"required"`), not content, so a Pancake channel could be created with `page_id` or `page_access_token` as `""`. Unlike Facebook (token-exchange step) or Zalo OA (mandatory OAuth flow), Pancake had no gate, and the only visible symptom was an opaque `decode response (HTTP 404): invalid character '<'` at first sync.

Fix: in `CreateChannel`, when `req.ChannelType == "pancake"`, the request body is unmarshaled into a local `{page_id, page_access_token}` struct and rejected with `400 invalid_credentials` if either field is missing/malformed JSON or blank after trimming whitespace, before any encryption/DB work happens.

**Tests:** none added. `backend/api/handlers` has zero existing `*_test.go` files and no `httptest`/gin-test-mode scaffolding anywhere under `backend/api/`. Per the task's explicit instruction ("if the package has no existing test infrastructure, don't build new infrastructure — just report why no test was added"), I left it untested rather than introducing a new test harness (gin router setup, sqlite/test-DB wiring, tenant middleware stubbing, etc.) as a side effect of a 4-finding bugfix pass. The change itself is a small, direct `if` block with no new dependencies.

## Verification

```
cd backend && go build ./... && go vet ./... && go test ./channels/ ./ai/ ./engine/
```

- `go build ./...` — clean, no output.
- `go vet ./...` — fails only on the pre-existing, explicitly-excluded issue: `ai/prompts_test.go:10:31: not enough arguments in call to BuildQCPrompt (have (string), want (string, string))`.
- `go test ./channels/ ./ai/ ./engine/`:
  - `channels` — **PASS**, all tests including the 3 new ones for C1/C2/I1 (`TestFetchMessagesReturnsPartialMessagesOnLaterPageError`, `TestRedactSecretsStripsTokenValues`, `TestPancakeRequestFailureDoesNotLeakToken`, `TestFacebookRequestFailureDoesNotLeakToken`, plus everything pre-existing).
  - `ai` — **FAIL (build failed)**: same pre-existing `BuildQCPrompt` signature mismatch as above; not touched per instructions.
  - `engine` — **FAIL**: pre-existing `TestCalculateCostUSD/claude_haiku_cheap` assertion failure (`cost 0.010500 out of range [0.001000, 0.005000]`), explicitly called out as out of scope; not touched.

Neither pre-existing failure is caused by or related to any of the 4 fixes in this pass.

## Constraints honored

- No new Go dependencies.
- No changes under `frontend/`.
- `classifyPancakeSender` in `backend/channels/pancake.go` untouched — only its call sites and `FetchMessages`'s error return were touched.
- Both pre-existing failing tests (`ai/prompts_test.go`, `engine.TestCalculateCostUSD`) left as-is; C1 did not require changing `BuildQCPrompt`'s signature, so the exception clause didn't apply.
