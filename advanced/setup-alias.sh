#!/usr/bin/env bash
# ------------------------------------------------------------------
# Sets up a `jira` alias so you can run commands without typing
# the full node path every time.
#
# Usage:
#   source advanced/setup-alias.sh
#
# To make it permanent, add this to your ~/.zshrc or ~/.bashrc:
#   source /full/path/to/cursor-jira-sync/advanced/setup-alias.sh
# ------------------------------------------------------------------

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"

jira() {
  node "$PROJECT_ROOT/bin/jira-cli.mjs" "$@"
}

echo "Alias ready — use 'jira <command>' instead of 'node bin/jira-cli.mjs <command>'"
