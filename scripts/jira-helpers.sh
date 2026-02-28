#!/usr/bin/env bash
# ------------------------------------------------------------------
# Jira helper shortcuts — source this file to get all commands.
# Usage:  source scripts/jira-helpers.sh
#         (or add this line to your ~/.zshrc / ~/.bashrc)
# ------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

# Load shared config (.env, paths)
if [ -f "$SCRIPT_DIR/env.sh" ]; then
  source "$SCRIPT_DIR/env.sh"
fi

# Also source Confluence helpers if present
if [ -f "$SCRIPT_DIR/confluence-helpers.sh" ]; then
  source "$SCRIPT_DIR/confluence-helpers.sh"
fi

# ------------------------------------------------------------------
# Core
# ------------------------------------------------------------------

# Raw access: jira <any command>
jira() {
  node "$JIRA_SCRIPT" "$@"
}

# My open tasks, sorted by priority
jira-my-tasks() {
  echo "=== My Open Tasks ==="
  node "$JIRA_SCRIPT" my "${@}"
}

# Current sprint board
jira-sprint() {
  echo "=== Current Sprint ==="
  node "$JIRA_SCRIPT" sprint "${@}"
}

# Single issue detail: jira-get ABC-123
jira-get() {
  if [ -z "$1" ]; then
    echo "Usage: jira-get <ISSUE-KEY>   e.g. jira-get ABC-123"
    return 1
  fi
  node "$JIRA_SCRIPT" get "$1"
}

# Fetch multiple issues at once: jira-batch ABC-1 ABC-2 ABC-3
jira-batch() {
  if [ -z "$1" ]; then
    echo "Usage: jira-batch <KEY1> <KEY2> ..."
    return 1
  fi
  node "$JIRA_SCRIPT" batch "$@"
}

# List subtasks of a story: jira-subtasks ABC-100
jira-subtasks() {
  if [ -z "$1" ]; then
    echo "Usage: jira-subtasks <PARENT-KEY>"
    return 1
  fi
  node "$JIRA_SCRIPT" subtasks "$1"
}

# ------------------------------------------------------------------
# Sprint cache
# ------------------------------------------------------------------

# Refresh sprint.md from Jira API
jira-sync() {
  echo "Syncing sprint.md..."
  node "$JIRA_SCRIPT" sync
}

# Check if the sprint cache is still fresh
jira-cache-status() {
  if [ ! -f "$SPRINT_META" ]; then
    echo "STALE — .sprint-meta.json missing (run: jira-sync)"
    return 1
  fi

  local valid synced_at ttl_ms now_ms age_ms ttl_hours age_hours
  valid=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SPRINT_META','utf8')).valid)")
  synced_at=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SPRINT_META','utf8')).syncedAt)")
  ttl_ms=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SPRINT_META','utf8')).ttlMs)")
  now_ms=$(node -e "console.log(Date.now())")

  if [ "$valid" != "true" ]; then
    echo "STALE — cache invalidated (run: jira-sync)"
    return 1
  fi

  age_ms=$((now_ms - synced_at))
  if [ "$age_ms" -gt "$ttl_ms" ]; then
    age_hours=$((age_ms / 3600000))
    ttl_hours=$((ttl_ms / 3600000))
    echo "STALE — ${age_hours}h old (TTL: ${ttl_hours}h)"
    return 1
  fi

  age_hours=$((age_ms / 3600000))
  echo "FRESH — synced ${age_hours}h ago"
  return 0
}

# Smart sync: reads from cache if fresh, syncs if stale
jira-smart-sync() {
  if jira-cache-status >/dev/null 2>&1; then
    echo "Cache is fresh — reading sprint.md"
    cat "$SPRINT_MD"
  else
    echo "Cache stale — fetching from Jira..."
    jira-sync
    cat "$SPRINT_MD"
  fi
}

# ------------------------------------------------------------------
# Status transitions
# ------------------------------------------------------------------

# Move issue(s) to In Progress: jira-start ABC-1 ABC-2
jira-start() {
  if [ -z "$1" ]; then
    echo "Usage: jira-start <KEY> [KEY2 ...]"
    return 1
  fi
  node "$JIRA_SCRIPT" transition "$@" "In Progress"
}

# Move issue(s) to Done: jira-done ABC-1
jira-done() {
  if [ -z "$1" ]; then
    echo "Usage: jira-done <KEY> [KEY2 ...]"
    return 1
  fi
  node "$JIRA_SCRIPT" transition "$@" "Done"
}

# Move issue(s) to Ready for Review: jira-review ABC-1
jira-review() {
  if [ -z "$1" ]; then
    echo "Usage: jira-review <KEY> [KEY2 ...]"
    return 1
  fi
  node "$JIRA_SCRIPT" transition "$@" "Ready for Review"
}

# ------------------------------------------------------------------
# Quick lookups
# ------------------------------------------------------------------

# Who am I — shows your accountId (needed for assign commands)
jira-whoami() {
  node "$JIRA_SCRIPT" me
}

# Custom JQL search: jira-search "project = ABC AND status = 'In Progress'"
jira-search() {
  if [ -z "$1" ]; then
    echo 'Usage: jira-search "<JQL>"'
    return 1
  fi
  node "$JIRA_SCRIPT" search "$1"
}

# ------------------------------------------------------------------
# Combo workflows
# ------------------------------------------------------------------

# Morning stand-up: cache check + my tasks + sprint board
jira-morning() {
  echo ""
  echo "=== Cache Status ==="
  jira-cache-status
  echo ""
  echo "=== My Tasks ==="
  node "$JIRA_SCRIPT" my --limit 10
  echo ""
  echo "=== Sprint Board ==="
  jira-smart-sync
}

# End of day: sync sprint + show my tasks
jira-eod() {
  echo "=== Refreshing Sprint ==="
  jira-sync
  echo ""
  echo "=== My Tasks ==="
  node "$JIRA_SCRIPT" my --limit 10
}

# ------------------------------------------------------------------
echo "Jira helpers loaded. Type any command to get started:"
echo ""
echo "  jira-morning          Start your day (tasks + sprint)"
echo "  jira-my-tasks         My open tasks"
echo "  jira-sprint           Current sprint board"
echo "  jira-get <KEY>        Single issue detail"
echo "  jira-batch <K1> <K2>  Multiple issues at once"
echo "  jira-sync             Refresh local sprint cache"
echo "  jira-start <KEY>      Move to In Progress"
echo "  jira-done <KEY>       Move to Done"
echo "  jira-review <KEY>     Move to Ready for Review"
echo "  jira-whoami           Your accountId"
echo "  jira-search \"<JQL>\"   Custom JQL search"
echo "  jira-eod              End of day summary"
