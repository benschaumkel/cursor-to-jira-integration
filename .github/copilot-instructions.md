# Copilot Instructions

## Commands

```bash
npm install          # install dependencies
npm test             # run all tests (Node built-in test runner)
npm run lint         # lint lib/, commands/, bin/
make setup           # install deps + scaffold .env and config.yaml from examples
make clean           # remove workspace/*.md and .sprint-meta.json
```

To run the CLI directly: `node bin/jira-cli.mjs <command>`

There is no single-test flag — the test runner uses `node --test tests/**/*.test.mjs`.

## Architecture

This is an ES module Node.js CLI (`"type": "module"`) that bridges Cursor IDE with Jira and Confluence via their REST APIs.

**Entry point & routing:** `bin/jira-cli.mjs` is a thin entry point — it loads config, creates the HTTP client, and dispatches to commands. No business logic lives here.

**Command layer** (`commands/`): Each file exports an array of `{ name, execute }` objects. All commands receive `{ args, flags, client, config }` — no globals. Commands are auto-registered via `commands/index.mjs`.
- `jira-read.mjs` — read-only Jira queries
- `jira-write.mjs` — Jira mutations (create, update, assign, transition)
- `jira-sync.mjs` — sprint cache operations
- `confluence-read.mjs` — Confluence queries

**API layer** (`lib/jira/`, `lib/confluence/`): Pure data-fetching modules. They receive a `client` object, return data, and throw `ApiError` on failure. They never `console.log`.

**Formatter layer** (`lib/formatters/`): Receive data, return strings. They never call APIs and never `console.log`. Jira-specific field transforms belong in `lib/jira/transforms.mjs`, not in formatters.

**Config** (`lib/config.mjs`): Merges `config.yaml` (structure) + `.env` (secrets). Supports named profiles for multi-instance Atlassian setups. Resolves to a single flat config object passed through the entire call chain.

**HTTP client** (`lib/client.mjs`): Handles retry, exponential backoff, and timeouts. Commands never implement their own retry logic.

**Local sprint cache**: `sync` writes `workspace/sprint-board.md`. The AI reads this before making API calls. `invalidateSprintCache(config)` must be called after any write operation.

## Key Conventions

**Secrets vs structure:** Credentials (`JIRA_EMAIL`, `JIRA_API_TOKEN`) go in `.env` only. Domains, project keys, and space keys go in `config.yaml`. Never hardcode either in source code.

**Config access:** Never import `dotenv` or read `process.env` directly inside commands or lib modules. All config comes through the `config` parameter passed by the entry point.

**API calls:** Use `client.requestJson()` for JSON responses. Use `client.request()` only for 204 No Content responses.

**New commands checklist:**
1. Add to the appropriate `commands/*.mjs` file
2. Add a help entry in `lib/cli.mjs` → `HELP_TEXT`
3. Add an intent mapping in `.cursor/rules/02-commands-reference.mdc`

**New env vars:** Add to `.env.example` with a comment. New config fields: add to `config.yaml` with a comment and handle missing values with sensible defaults in `lib/config.mjs`.

**Output modes:** Commands handle both `flags.json` (structured JSON output) and plain text (formatted output via formatters).

**Write safety:** All write commands save a snapshot of the current issue state to `.jira-history/` before making changes.

**File types:** All source files use `.mjs` (ES modules). No CommonJS.

**Confluence URLs — always use ID-only format:** When sharing a Confluence link with a user, always use the ID-only URL:
- ✅ `https://yourcompany.atlassian.net/wiki/spaces/ENG/pages/123456789`
- ❌ `https://yourcompany.atlassian.net/wiki/spaces/ENG/pages/123456789/My+Page+Title+With+Spaces`

The `page-info` command appends the URL-encoded title slug — if it doesn't exactly match what Confluence expects, the link 404s. The ID-only URL always works.
