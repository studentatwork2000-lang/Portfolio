# Codex Remote Web

A personal ChatGPT-style browser controller for the Codex CLI in your GitHub Codespace. React + TypeScript frontend, Node + TypeScript backend, official App Server over stdio, and same-origin HTTP/SSE. Execution stays on the remote machine.

This package was built in a separate workspace. It has **not been deployed to your Codespace**. No private URL is invented, and no portfolio files were accessed or changed. The real local Codex 0.162.1 binary was checked for initialization, authentication state, model catalog, and thread listing. Authenticated inference and your actual saved CLI sessions still need verification in your Codespace.

## One-time installation

Use your existing Codespace browser interface for this one-time installation. Open `/tmp` as a temporary Explorer folder and upload `Codex_Remote_Web.zip` there. This keeps the archive out of your portfolio. There is no laptop-side app to install.

Run in the Codespace terminal:

```bash
mkdir -p "$HOME/apps"
test ! -e "$HOME/apps/codex-remote-web" || { echo 'That app directory already exists; choose a new location.'; exit 1; }
unzip /tmp/Codex_Remote_Web.zip -d "$HOME/apps"
cd "$HOME/apps/codex-remote-web"
npm ci
```

You need Node 22.18+ (Node 24 LTS preferred). Use the **existing installed Codex**. Do not run a new global Codex install or upgrade it just to use this app.

Find the absolute portfolio directory with `pwd` in its existing terminal. Configure the controller using that exact path, for example:

```bash
npm run setup -- /workspaces/YOUR_ACTUAL_PORTFOLIO_FOLDER
```

Replace the example path. Setup asks for a separate app passphrase with hidden input; it stores a salted scrypt hash, never the plaintext passphrase. It adds a disposable verification workspace inside the controller's own `.runtime` directory. Additional workspace paths can follow the first one. Existing Codex authentication and configuration are preserved.

If `codex` is not on `PATH`, set `codexPath` to its absolute executable path in `config.local.json`, then run `npm run inspect`. Setup generates protocol schemas from the installed binary and checks that the required methods exist. The backend validates outgoing requests against those schemas and refuses a changed Codex version until inspected again.

```bash
npm run build
npm run service -- start
```

The archive includes production builds, but rebuilding once after installation is recommended. Startup prints your actual URL from `CODESPACE_NAME` and `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`.

In the Codespaces **Ports** panel, forward **8787** and confirm **Private** visibility. Setup attempts this supported command when `gh` is available:

```bash
gh codespace ports visibility 8787:private --codespace "$CODESPACE_NAME"
```

Do not make the port public. Open the generated private URL in Brave, authenticate to GitHub if prompted, then sign in with your app passphrase. Bookmark it. After installation, neither a VS Code connection nor its terminal tab needs to stay open.

## Daily use

Select a workspace and model, write a prompt, and send it. Enter sends; Shift+Enter adds a line. Drafts and preferences stay in browser storage. Authentication credentials do not.

Read-only is the default. **Workspace edits** allows sandboxed writes inside the conversation's configured workspace; unknown commands require review, and network access is restricted. **Full access** removes Codex's filesystem and network sandbox inside the Codespace and runs commands without approval prompts (`danger-full-access` / `never`). It applies to new conversations, resumed conversations, and subsequent prompts in an existing conversation. The selected mode is saved in this browser and can be changed when no turn is running. Full access is limited by the Codespace user's operating-system permissions; it does not grant access to the computer running your browser. Managed Codex requirements remain authoritative and may reject a requested policy.

Saved CLI, VS Code, and App Server conversations appear in history. Opening one reads it without resuming. Before resuming a saved session, confirm that another CLI or controller is no longer using it. This app cannot detect every independently running CLI process or attach to an already running CLI turn. Threads outside configured workspaces can be viewed but cannot be resumed for execution until their directory is added through setup.

Command output, file diffs, and supported activity appear in collapsible panels. Command/file approvals support **Approve once**, **Reject**, or **Cancel turn**. Supported user-input requests have answer controls. Unsupported permissions, dynamic tool calls, token-refresh requests, or MCP elicitations receive a visible failure with no permission granted. The app does not silently bypass an interaction it cannot handle.

Submitted prompts remain visible in the conversation after replies. Accepted prompts also have private recovery records in `.runtime/prompt-history`, so missing or partial Codex events cannot erase them after a reload or service restart. Native Codex history stays authoritative; matching echoed user messages are merged without duplicates. Existing prompts are recovered from Codex history wherever available.

Models and reasoning levels come from the installed App Server catalog. A successful inference turn confirms model access; appearing in the menu does not establish entitlement.

While a turn runs, **Working for 1m 02s** shows its elapsed wall time and updates once per second. It continues while waiting for your input. Completed turns show **Worked for …**; interrupted or failed turns show **Stopped after …** or **Failed after …**. The timer uses Codex's native start/completion timestamps and duration, so reconnecting or reloading does not reset it. Older turns with no recorded timing omit the duration instead of inventing one. Timer updates are isolated from the conversation rendering and do not change execution or streaming speed.

## Start, stop, and recover

From the controller directory:

```bash
npm run service -- status
npm run service -- start
npm run service -- restart
npm run service -- stop
```

`npm start` runs in the foreground for debugging. The service command uses a detached process, with a PID record and a controller-only log. Closing Brave disconnects the stream; it does not send an interruption. Reopening reconnects and synchronizes current items, pending approvals, and saved history. Duplicate request IDs are journaled on disk before submission so network retries and reloads do not automatically create a second turn.

A service restart or Codex process termination **ends running work**. Saved conversations remain in Codex's own storage. Uncertain submissions are never automatically resent. Inspect history and any disk changes before issuing a new prompt. On a Codex child-process failure, the bridge restarts with bounded backoff and reports that the old turn was lost.

Codespaces can stop because of idle timeout or maximum lifetime. Running a background service is not a guarantee that GitHub will keep the machine running. Start your Codespace from GitHub's Codespaces page, then start the controller service again. Automatic startup is deliberately not installed into your portfolio's devcontainer, shell, or user services.

After changing Codex versions:

```bash
npm run inspect
npm run service -- restart
```

To change the app passphrase, run `npm run setup -- --reset-password`, then restart. Restart invalidates existing app sessions. Add remote custom origins explicitly to `config.local.json` only if using an approved HTTPS forwarding origin; wildcard origins are not supported. The default server binds to loopback.

## Verify on your real Codespace

```bash
npm run verify
npm run verify -- --live
```

The first check authenticates to your controller and checks its connection, Codex sign-in, catalog, and saved-thread listing. The second runs real inference and creates `verification.txt` **only in the controller's disposable test workspace**. It consumes your normal Codex usage. If approval is requested, review it in the browser; the check never accepts automatically.

Also verify manually:

1. Open the actual private URL in Brave and send a simple prompt.
2. Open a genuine saved CLI conversation, inspect its history, then resume after stopping its other controller.
3. Send a safe command in the disposable workspace, and test both approval and rejection.
4. Close Brave during a turn; reopen and confirm there is only one submission and current streaming state is correct.
5. Check the Ports panel still says Private and another unauthenticated browser cannot access control routes.

For local automated checks:

```bash
npm test
npx playwright install chromium
npm run test:browser
```

These use an explicitly isolated protocol fixture, never fake sessions in production and never real inference. See `docs/TEST_RESULTS.md` for measured results and tests still pending on your account.

## Security and resource boundaries

GitHub private-port authentication plus an app passphrase protects access. Sessions use random, server-side IDs in HttpOnly, SameSite=Strict cookies, with Secure on HTTPS. Mutations require a CSRF token and a known origin. Host checks reject DNS rebinding; login is rate limited; no raw RPC or arbitrary file-reading endpoint is exposed. Markdown is sanitized, links are constrained, scripts and untrusted images are removed, and terminal text is rendered as text. These checks were tested locally; real GitHub forwarding must still be verified after installation.

SSE replay is bounded to 2 MiB / 2,000 events; slow clients reconnect rather than growing a write queue forever. Live tool output is capped; recent-turn state, request queues, and journals have limits. Very long tool output may show only its tail in live views. History is loaded 30 turns at a time and rendered incrementally. The stable Codex full-history API still reads the stored thread on the backend before slicing; it is not true server-side turn pagination. Code highlighting loads only when a completed code block needs it. No analytics, external font requests, animation framework, autoplay, or service worker.

## Deliberate limitations

- This is a functional portable implementation, not a deployment to your account.
- Authentication remains owned by your existing Codex CLI. If it is signed out, run its supported `codex login` flow yourself and restart; the web controller does not collect Codex tokens.
- No takeover of an independently running CLI turn, no guarantee against another controller ignoring the concurrency warning, and no survival of Codespace termination.
- No image/file attachments, public hosting, extension, automatic startup modification, custom MCP elicitation forms, or experimental permission grants.
- Current CLI protocol 0.162.1 was checked locally. Your installed version is checked by setup; unknown incompatibilities fail visibly rather than being guessed or silently translated.
- Layout was refined against ChatGPT's public interface and tested at desktop/mobile widths. It is independently branded and is not a pixel-perfect claim about every signed-in ChatGPT variant.

Official references: [Codex App Server](https://developers.openai.com/codex/app-server), [App Server architecture](https://openai.com/index/unlocking-the-codex-harness/), [Codex as a platform](https://developers.openai.com/blog/codex-as-a-platform), [GitHub port forwarding](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace), [Codespaces lifecycle](https://docs.github.com/en/codespaces/about-codespaces/understanding-the-codespace-lifecycle).
