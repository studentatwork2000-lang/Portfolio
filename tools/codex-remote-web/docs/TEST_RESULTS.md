# Test results — 12 October 2026

## Environment and scope

Built in an isolated Linux workspace, using Node 24.19.0. No user Codespace connection, installed user CLI, portfolio repository, existing user sessions, or credentials were available. A temporary official Codex 0.162.1 installation was used for protocol generation and read-only compatibility checks; it is **not** bundled or installed by the controller.

Production TypeScript checks and Vite build passed. The app has no direct OpenAI API client or API-key setup; production launches the already installed Codex executable under the same user/environment.

The detached service helper was also exercised through start, status, restart, stop, and final stopped-status checks with an isolated fixture. Its health-instance check prevents signaling a reused PID belonging to an unrelated process.

## Real binary checks

| Check | Evidence |
|---|---|
| Installed official binary | `codex-cli 0.162.1` in an isolated tools folder |
| Schema generation | JSON Schema and TypeScript generation completed |
| App Server initialization | `initialize` succeeded, then `initialized` was sent |
| Authentication status | `account/read` returned no signed-in account and required authentication |
| Model catalog | `model/list` returned 8 entries; no entitlement claim |
| Thread listing | `thread/list` accepted CLI/VS Code/App Server source filters and returned 0 saved threads in the isolated Codex home |
| Real inference | Not performed: no authenticated user account |
| Empty real thread creation | Attempted without authentication and timed out; not counted as passed |

The backend now checks sign-in before thread creation or prompt submission so this unauthenticated condition produces a clear instruction instead of trying inference.

## Automated integration tests

All **7 tests passed** against an explicit protocol fixture. Outgoing requests were validated against a reduced schema generated from the real 0.162.1 binary. The fixture is used only by tests; normal production setup never selects it or shows its sessions.

1. Authentication, host/origin rejection, CSRF rejection, unknown RPC-route rejection, workspace allowlist, protected configuration, security headers.
2. Saved CLI fixture read without resumption; explicit concurrency acknowledgment required before resuming.
3. Progressive text streaming; browser-stream disconnect does not stop work; duplicate turn prevention before and after backend restart.
4. Real JSON-RPC request-ID routing in the fixture, rejection behavior, broad-grant rejection, stale-approval rejection.
5. Model and reasoning-effort validation; interruption changes the stored turn state.
6. Supported rename and archive operations.
7. Approve-once behavior and visible failure for unsupported permission requests.

Fixture tests verify the controller's behavior, **not** actual account entitlement, Codex tool execution, or saved-session compatibility with your account.

## Browser checks

Eight scenarios passed in headless Chromium 141 with the production frontend and a fixture backend:

- Login and creation of a new conversation.
- Progressively streamed Markdown, tables, and lazy code highlighting.
- Script/image injection removed; no injected code ran.
- Unsaved draft survived reload.
- Approval panel rejection completed with the expected fixture result.
- Browser closed and reopened during work; the backend kept running, and state/history recovered.
- Long streamed output remained responsive.
- Desktop 1440 × 900 and phone 390 × 844 layouts; no horizontal mobile overflow.

Screenshots were inspected internally. A refinement pass changed the title weight, used a local OFL-licensed Inter variable font, and corrected duplicate code-copy controls and mobile sidebar labels. No private browser screenshots are included in the package.

The latest complete UI run sampled 12 browser interactions during streaming: **maximum 4 ms** round trip in this test environment. Reopening to completed fixture response took **2.51 s**, which includes the remaining artificial stream delay. These measurements do not predict Brave performance on the user's low-spec laptop or live model latency.

## Production resources

| Asset | Uncompressed | Gzip |
|---|---:|---:|
| Initial JavaScript | 324.18 KB | 103.58 KB |
| CSS | 16.28 KB | 4.55 KB |
| Lazy syntax-highlighting chunk | 58.37 KB | 18.72 KB |
| Latin normal variable font | 48.26 KB | Font compressed already |
| Optional italic font | 51.83 KB | Loaded only when needed |

An initialized Node bridge with a fixture child used **51.9 MiB RSS**. Over a 3.01 s idle sample with two status reads, measured Node CPU was **0.27% of one core**. The child fixture, real Codex inference, real CLI history scans, proxy latency, and the user's browser hardware are outside those resource measurements.

## User acceptance tests

| Requested test | Current evidence | Remaining work |
|---|---|---|
| A: Brave/private Codespaces URL | App login tested locally | Real private URL/GitHub authentication/Brave |
| B: New conversation | Protocol fixture passed | Authenticated Codex response |
| C: Existing CLI conversation | Read/resume routing fixture passed | Genuine user CLI session |
| D: File execution | Live verification command provided | Real disposable file on Codespace |
| E: Streaming | Fixture events/UI passed | Authenticated live inference |
| F: Approvals | Accept/reject/unsupported behavior fixture passed | Real safe Codex approval |
| G: Reconnection | Browser closure, reload, and restart tests passed | Private proxy connection |
| H: Performance | Production bundle/resources/UI responsiveness measured | Low-spec laptop and very large real history |
| I: Security | Local authentication/CSRF/origin/allowlist/sanitization checks passed | Verify GitHub port is Private and unauthorized browser blocked |
| J: Production access | Built production assets served/tested locally | Actual private forwarded URL |

Run `npm run verify` and `npm run verify -- --live` after installation, then complete the manual checklist in README. The deployment, authentication, and Codespace-dependent rows remain pending; they were not marked passed without evidence.


## Prompt-history regression fix

The disappearing prompt was reproduced with a fixture that omits user-message events and includes only assistant items in turn completion. The original code returned zero user messages even though the native stored turn contained the prompt.

The fix merges lifecycle items, preserves native stored history when overlaying live state, and records accepted prompts privately for reload/restart recovery. Real Codex user-message IDs take precedence over supplemental records; identical prompts in distinct turns remain distinct.

The expanded unit/integration suite passed all 12 tests, including sparse completion, multiline content, duplicate echo prevention, repeated prompt text, idempotent retries, older-history reads, and service restart with sparse stored-history responses. Production TypeScript checks and Vite build passed.

The browser regression run also passed: the submitted multiline prompt remained visible after completion and reload, with exactly one user bubble. All 10 browser scenarios passed, including the earlier login, sanitization, draft, approval, reconnection, streaming, and phone-layout checks. Updated initial JavaScript is 103.85 KB gzipped. The running user Codespace still needs to pull this commit and restart its service to activate the fix.
