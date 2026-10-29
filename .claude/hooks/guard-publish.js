#!/usr/bin/env node
// PreToolUse guard for Bash. Blocks `git push` and `npm publish` so they only
// run when the user asked for them. Set CLAUDE_ALLOW_PUBLISH=1 in the shell
// that starts Claude Code to allow them. Exit 2 blocks the call; stderr is
// shown to Claude as the reason.
//
// Fail-safe: if the input is not valid JSON, or has no string
// `tool_input.command`, the call is blocked. An uncaught error would exit
// with status 1, which Claude Code treats as a non-blocking error, so the
// Bash call would run anyway. Catching the error here prevents that.

const PUBLISH_PATTERNS = [
  /(^|[;&|(\s])git\s+push(\s|$)/,
  /(^|[;&|(\s])npm\s+publish(\s|$)/,
];

function block(reason) {
  process.stderr.write(`Blocked: ${reason}\n`);
  process.exit(2);
}

let input = '';
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  if (process.env.CLAUDE_ALLOW_PUBLISH === '1') process.exit(0);

  let command;
  try {
    command = JSON.parse(input).tool_input.command;
  } catch {
    block('the hook input is not valid JSON, so the Bash call was refused.');
  }
  if (typeof command !== 'string') {
    block('the hook input has no Bash command string, so the call was refused.');
  }

  if (PUBLISH_PATTERNS.some((pattern) => pattern.test(command))) {
    block(`"${command}" would push or publish. Ask the user to confirm, or set CLAUDE_ALLOW_PUBLISH=1.`);
  }
  process.exit(0);
});
