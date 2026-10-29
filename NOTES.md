# Notes: Claude Code setup

This file describes the Claude Code configuration in this pull request and what was checked for it. Items marked **not verified** were written but not exercised. Application code is not part of this PR.

## 1. MCP: fetch server

- **Configuration:** `.mcp.json` declares a `fetch` server that starts with the command `uvx mcp-server-fetch`.
- **Use for documentation:** the server lets a session read web documentation pages directly. Verified on `https://expressjs.com/en/guide/routing.html`.
- **Permission:** `.claude/settings.json` contains `permissions.allow: ["mcp__fetch__fetch"]`. This file is part of the commit, so calls to `mcp__fetch__fetch` will not ask other contributors for confirmation. `.claude/settings.local.json` is not part of the commit: it is ignored via `.gitignore:7`.
- **Environment requirement:** the `uv` tool (command `uvx`) must be installed. On first start, `uvx` downloads and runs the `mcp-server-fetch` package from an external package index. This is a third-party package. Its code is not stored in this repository and has not been reviewed.
- **What was verified:** a call to `mcp__fetch__fetch` for the URL above returned the actual page content. This confirms the server worked on this machine, where it was already configured.
- **What was not verified:**
  - installation and startup on a clean machine were not tested;
  - the `/mcp` command and the approval dialog for the project server were not observed by the assistant, because that command is run by the user;
  - `uvx` was not run manually; the server started through the existing configured connection.

## 2. Skill: add-api-route

- **File:** `.claude/skills/add-api-route/SKILL.md`.
- **What it describes:**
  - structure: one router per resource in `routes/`, mounting in `server.js`, all data access through `db/store.js`;
  - response format: JSON, `201` for creation, `200` for reads and updates, errors as `{ "error": "..." }` with `400` and `404` status codes;
  - validation in the route before the store is called;
  - tests with `node:test` and `supertest`, with `store.reset()` in `beforeEach`;
  - updating `docs/api.md`.
- **Known gap:** `:id` routes do not check for `NaN` after `Number(...)`. The skill tells contributors not to copy this.
- **Automatic activation check: verified.** A headless `claude -p` run received a request to create a route, `GET /ping-check`, without mentioning the Skill. In the `stream-json` output, the model's first tool call was `Skill` with `skill: "add-api-route"`. This shows activation from the `description` for one request. It is a single check and does not cover every possible phrasing.
- **No side effects:** write permissions were denied (`Write` disabled), `routes/ping-check.js` was not created, and the repository hashes did not change.

## 3. Command: /review-changes

- **File:** `.claude/commands/review-changes.md`.
- **What it is meant to do:**
  - analyze `git diff` and `git diff --cached`, and read new files;
  - compare the changes against `CLAUDE.md` and the surrounding code;
  - look for bugs, security problems, and missing tests;
  - report findings by severity with file references, without fixing them;
  - mark `npm test` and lint as "not run" when dependencies are missing or the permission mode denies them.
- **Bash permissions:** only the exact commands `git status`, `git status --short`, `git diff`, `git diff --cached`, `npm test`, and `npm run lint`. Pipes, chains, and wildcard patterns are not allowed. `git log` was removed from the permissions because the command does not use it.
- **The command text requires these exact forms.** Its instructions say to run the git commands exactly as written, from the repository root, without `-C <path>`, `--output`, or other options. Any other form is denied by the permission rules.
- **Running tests needs its own permission:** for the command to run `npm test` and `npm run lint`, those two calls must be allowed. If they are denied, the command reports that the check did not run.

### Runs of the command

- **Earlier run (before the permissions were corrected):** `claude -p "/review-changes"` with Edit, Write, and NotebookEdit denied and permission mode `dontAsk`. Exit code 0, `is_error: false`, no files changed (repository hashes matched). The `npm test 2>&1 | tail ...` compound call did not match `Bash(npm test)`, so tests and lint were denied.
- **Final pre-commit run:** `claude -p "/review-changes"` with Edit, Write, NotebookEdit, `Bash(npm test)`, and `Bash(npm run lint)` denied, and permission mode `dontAsk`. Exit code 0, `subtype: success`, `is_error: false`, no files changed (repository hashes matched), stderr empty.
- **The final run was a successful invocation, but the review is incomplete.** The model used `git -C <path> ...` instead of the allowed forms, and all three git calls were denied (`git status --short`, `git diff`, `git diff --cached`). Its analysis was therefore based on reading the files directly, not on the diff. It could not see the diff hunks and could not confirm which exact lines changed. **The review does not fully validate the diff.** It also did not run `npm test` or `npm run lint`, because those were denied on purpose for this run.
- **Findings from the final run** (these come from reading the files, not from the diff):
  - blocker: the index does not match the full work; the route, its test, the `server.js` mount, `db/store.js`, and `docs/api.md` are not staged. This is intentional for this PR, but it should be confirmed;
  - major: `.mcp.json` runs an unreviewed third-party package, and `.claude/settings.json` auto-allows `mcp__fetch__fetch`;
  - major: tests and lint are not verified;
  - minor: the resource list in `db/store.js` duplicates the mounts in `server.js`; the test does not check `path`; `routes/users.js` passes `Number(req.params.id)` without a `NaN` check (existing code, outside this PR); the hook's JSON handling (fixed in section 4); `NOTES.md` is in English now, but its scope should still be confirmed.
- **Not verified after the permission fix:** the Git commands were not re-run with the exact forms. The effect of the corrected instructions is unconfirmed.

### Points to consider before the PR

- committing `.mcp.json` means every contributor will run `uvx mcp-server-fetch` (see section 1);
- the staged set is intentionally limited to configuration and `NOTES.md`; the application changes stay outside this commit.

## 4. Hook: PreToolUse for Bash

- **Configuration:** `.claude/settings.json`, key `hooks.PreToolUse`, matcher `Bash`, command `node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-publish.js"`, timeout 10 seconds.
- **What it blocks:** `git push` and `npm publish`, including when they follow `&&`, `;`, or `|`. Exit code 2; the reason is passed through stderr.
- **Fail-safe for malformed input:** if the hook input is not valid JSON, or has no string `tool_input.command`, the hook exits with code 2 and blocks the Bash call. The parse is wrapped in `try`/`catch`. Without this, an uncaught error would exit with code 1, which Claude Code treats as a non-blocking error, so the call would run. With `CLAUDE_ALLOW_PUBLISH=1` set, the hook allows all calls, including malformed input. This is an explicit user choice.
- **What it does not touch:** `git status`, `git diff`, `git log`, `npm test`, `npm run lint`.
- **Bypass:** the environment variable `CLAUDE_ALLOW_PUBLISH=1` in the shell that starts Claude Code.
- **How it was verified:**
  - earlier: simulation on 8 inputs with expected exit codes, all 8 matched;
  - after the fail-safe change: `node --check` passed, and 14 focused inputs were run through stdin. They cover malformed input (not JSON, empty input, `null`, `tool_input: null`, missing command, non-string command), publish detection (`git push`, `npm publish`, a chained `npm publish`), allowed commands (`git status --short`, `git diff --cached`, `npm test`), and the override. All 14 matched the expected exit codes. No run exited with code 1. The publish commands were only passed as text on stdin and were not executed;
  - earlier: a live `git push --dry-run` through the Bash tool was blocked; the message appeared with the prefix `PreToolUse:Bash hook error`;
  - earlier: a live `git status --short` passed.
- **Known limitations:**
  - false positives: the regex also matches text inside quotes, for example `echo "git push"`;
  - misses: `git -C dir push`, Git aliases, and publishing through a script in `package.json`;
  - the hook cannot tell whether the user asked for the action, so approval is possible only through the environment variable;
  - the hook guards against accidental calls by Claude, not against direct runs in a regular terminal;
  - the malformed-input fail-safe was tested with stdin simulation only, not in a live hook call.

## 5. Headless: claude -p

- **CLI version:** 2.1.312.
- **Task:** summarize the current Git changes without editing source files.
- **Command used:** `claude -p <prompt> --tools "Read,Bash" --allowedTools "Read,Bash(git status:*),Bash(git diff --stat:*),Bash(git diff --cached --stat:*),Bash(git log --oneline:*)" --disallowedTools "Edit,Write,NotebookEdit" --permission-mode dontAsk --no-session-persistence --max-budget-usd 0.50 --output-format json`.
- **Permissions:** Read and Bash only for the listed patterns. Edit, Write, and NotebookEdit are denied. Everything else is rejected by `dontAsk` mode.
- **Result:** exit code 0, `subtype: success`, `is_error: false`, empty `permission_denials`. Cost about $0.007.
- **Check that nothing changed:** the hashes of `git status --porcelain`, `git diff`, and `git diff --cached` matched before and after the run. stderr was empty.
- **Limitation:** Bash permissions are defined with patterns, which is not full isolation. The pattern `git diff --stat:*` would in theory also match `git diff --stat --output=<file>`, which writes a file. The prompt forbids such a command, but that is an instruction to the model, not a permission rule. For strict isolation, remove Bash and keep only Read.
- **Artifact:** the response was saved in the session's scratchpad directory, not in the repository.

## 6. Tests and lint

- **`npm test` was not run** and **`npm run lint` was not run.** Reason: the repository has no `node_modules`; `npm ci` was blocked because it downloads executable code, and that run had not been approved. In the final `/review-changes` run, both were also denied on purpose.
- Earlier, `npm test` failed with `Cannot find module 'supertest'`.
- Application files are not part of this PR, so their tests and lint were not evaluated here.
- **No test is verified as passing.** To check, installation of dependencies must be approved, and then `npm ci`, `npm test`, and `npm run lint` must be run.

## What was not done

- No commit or push was created.
- Dependencies were not installed.
- Application files were not changed in this step.
