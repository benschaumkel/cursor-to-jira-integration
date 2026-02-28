#!/usr/bin/env bash
# ------------------------------------------------------------------
# Confluence helper shortcuts — sourced automatically by jira-helpers.sh
# You can also source this directly: source scripts/confluence-helpers.sh
# ------------------------------------------------------------------

# Prevent duplicate alias errors on re-source
unalias conf-recent conf-search conf-standups conf-meetings conf-open \
        conf-browse conf-children conf-tree conf-hub conf-page-info \
        conf-my-pages conf-spaces conf-space-pages 2>/dev/null

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
CONF_SCRIPT="$SCRIPT_DIR/jira-api.mjs"

# Recently updated pages
conf-recent() {
  node "$CONF_SCRIPT" recent --limit "${1:-10}"
}

# Pages you've contributed to
conf-my-pages() {
  node "$CONF_SCRIPT" my-pages --limit "${1:-10}"
}

# Search Confluence by content: conf-search "query"
conf-search() {
  [ -z "$1" ] && echo 'Usage: conf-search "query"' && return 1
  node "$CONF_SCRIPT" conf-search "$1" --limit "${2:-15}"
}

# Find a page by title (returns top match + children): conf-browse "query"
conf-browse() {
  [ -z "$1" ] && echo 'Usage: conf-browse "query"' && return 1
  node "$CONF_SCRIPT" browse "$1"
}

# Get info about a page by ID or URL: conf-page-info <id or url>
conf-page-info() {
  [ -z "$1" ] && echo 'Usage: conf-page-info <id or url>' && return 1
  node "$CONF_SCRIPT" page-info "$1"
}

# List child pages: conf-children <id or url>
conf-children() {
  [ -z "$1" ] && echo 'Usage: conf-children <id or url>' && return 1
  node "$CONF_SCRIPT" children "$1"
}

# Visual tree of nested pages (depth 2 by default): conf-tree <id or url>
conf-tree() {
  [ -z "$1" ] && echo 'Usage: conf-tree <id or url>' && return 1
  node "$CONF_SCRIPT" page-tree "$@"
}

# List all Confluence spaces
conf-spaces() {
  node "$CONF_SCRIPT" spaces
}

# Pages in a specific space: conf-space-pages IA
conf-space-pages() {
  [ -z "$1" ] && echo 'Usage: conf-space-pages <SPACE-KEY>' && return 1
  node "$CONF_SCRIPT" space-pages "$1" --limit "${2:-20}"
}

# ------------------------------------------------------------------
# Bookmark shortcuts — edit these to point to pages you visit often.
# Find a page's ID by running: conf-browse "page title"
# ------------------------------------------------------------------

# Example: conf-hub → opens your team hub page
# conf-hub() { node "$CONF_SCRIPT" children YOUR_HUB_PAGE_ID; }

# Example: conf-standups → prints link to your standup notes page
# conf-standups() { echo "https://yourorg.atlassian.net/wiki/..."; }

# ------------------------------------------------------------------
echo "Confluence helpers loaded: conf-search, conf-browse, conf-children, conf-tree, conf-spaces, conf-recent"
