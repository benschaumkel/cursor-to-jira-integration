#!/usr/bin/env bash
# Shared config — source this first in any helper script.
# Automatically detects the project root (the folder above /scripts/).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key val; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    key=$(echo "$key" | xargs)
    val=$(echo "$val" | sed "s/^[\"']//;s/[\"']$//" | xargs)
    [ -n "$key" ] && export "$key"="$val"
  done < "$ENV_FILE"
fi

export REPO_ROOT="${REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export JIRA_SCRIPT="$REPO_ROOT/scripts/jira-api.mjs"
export SPRINT_MD="$REPO_ROOT/sprint.md"
export SPRINT_META="$REPO_ROOT/.sprint-meta.json"
