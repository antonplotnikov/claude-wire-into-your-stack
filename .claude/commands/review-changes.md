---
description: Review uncommitted changes before opening a pull request
allowed-tools: Bash(git status), Bash(git status --short), Bash(git diff), Bash(git diff --cached), Bash(npm test), Bash(npm run lint)
---

Review the changes in this repository before a pull request. Do not edit, stage, commit, or push anything. Report findings only.

## 1. Collect the changes

- Run `git status --short` from the repository root.
- Run `git diff` for unstaged changes.
- Run `git diff --cached` for staged changes.
- For any new untracked file that is part of the work, read it in full with the Read tool, because `git diff` does not show it.
- If there are no changes at all, say so and stop.

Run each git command exactly as written above, on its own, from the repository root. Do not add `-C <path>`, `--output`, or any other option, and do not pipe, chain, or redirect them. The permission rules allow only these exact forms, so any other form is denied.

## 2. Check the project rules

Read `CLAUDE.md` and compare the changes against it and against the code around them:

- One route file per resource, mounted in `server.js` under its base path.
- All data access goes through `db/store.js`. Routes must not hold state.
- Input is validated in the route, with `400` for bad input and `404` for a missing record.
- Error responses use the `{ "error": "message" }` shape.
- Changed endpoints are documented in `docs/api.md`.

Match the naming, comment style, and structure of the files next to the change.

## 3. Look for problems

- **Bugs:** wrong status codes, unhandled missing values, `Number(...)` results that are not checked for `NaN`, state changes that leak between requests.
- **Security:** unvalidated input reaching the store, secrets or personal data in the diff, `.env` or credential files being staged, and commands that publish or push.
- **Tests:** every new or changed route needs a test for its success case and for each error status it can return. Flag anything that is missing.

## 4. Run the checks, if possible

- Run `npm test` as its own command, then `npm run lint` as its own command. Do not pipe, chain, or add arguments to them. These are the only permitted forms.
- If a command is denied by the permission mode, report that check as **not run**. Do not work around the denial.
- If a check fails because a dependency is missing (for example `Cannot find module` or `eslint: command not found`), do not install anything. Report the check as **not run** and name the missing dependency.
- Show the failing lines from the output. Do not summarize a failure as a pass.

## 5. Report

Group the findings by severity, with the file and line for each:

- **Blocker:** must be fixed before the pull request.
- **Major:** likely bug or missing test.
- **Minor:** style or consistency.

End with a short statement of what was checked, which checks ran, and which did not run.
