# Cursor to Jira Integration

Talk to Jira directly from Cursor chat. No MCP, no admin approval — just a script and an API token.

**Optimised for token efficiency** — compact text output by default (not JSON), local sprint cache, and a rule that tells the AI to read the cache before hitting the API.

## Setup (3 steps)

### 1. Copy files into your project

```bash
cp -r cursor-jira-integration/scripts ./scripts
cp cursor-jira-integration/.env.example ./.env.example
mkdir -p .cursor/rules
cp cursor-jira-integration/.cursor/rules/jira-tasks.mdc .cursor/rules/
```

You should end up with:

```
your-project/
  scripts/jira-api.mjs
  .cursor/rules/jira-tasks.mdc
  .env            ← you create this next
  .env.example
```

### 2. Create your `.env`

```bash
cp .env.example .env
```

Fill in your details:

```
JIRA_DOMAIN=your-domain
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=paste-your-token-here
```

Get your API token: https://id.atlassian.com/manage-profile/security/api-tokens

Make sure `.env` is in your `.gitignore`.

### 3. Test it

```bash
node scripts/jira-api.mjs me
```

If you see your name and account ID, you're good to go.

## Usage

Just ask Cursor things like:

- "What are my Jira tasks?"
- "Show details for DPH-123"
- "What's in the current sprint?"
- "Get DPH-1, DPH-2, and DPH-3"
- "Show me the subtasks of DPH-100"
- "Move DPH-123 to In Progress"
- "Assign DPH-123 to me"
- "Sync my sprint board"

The Cursor rule handles the rest.

## Commands

All commands output **compact text by default**. Add `--json` for structured JSON output. Add `--limit N` to cap results.

### Read commands

| Command | What it does |
|---------|-------------|
| `my` | Your open tasks sorted by priority (default 20) |
| `sprint` | Current sprint issues for the project |
| `search "JQL"` | Search with custom JQL |
| `get DPH-123` | Single issue detail |
| `batch DPH-1 DPH-2 DPH-3` | Multiple issues in 1 API call |
| `subtasks DPH-100` | Children of a parent issue |
| `me` | Current user info |

### Write commands

| Command | What it does |
|---------|-------------|
| `assign DPH-1 DPH-2 <accountId>` | Assign issues (multi-key) |
| `transition DPH-1 DPH-2 "In Progress"` | Change status (multi-key) |
| `update DPH-123 '{"summary":"..."}'` | Edit issue fields |
| `create-subtask DPH-123 "summary" [accountId]` | Create a subtask |
| `comment DPH-123 "text"` | Add a comment |

### Cache

| Command | What it does |
|---------|-------------|
| `sync` | Fetch current sprint → write `sprint.md` |

## Compact output (default)

Output is **compact text by default** — a clean table that's cheap to read:

```
My Tasks — 8 issues

KEY        STATUS            PRIORITY     AGE  SUMMARY
DPH-201    In Progress       High (P2)    30m  Implement SSO login
DPH-145    To Do             High (P2)    1d   Add MFA support
DPH-312    In Review         Medium (P3)  4h   Update user avatar flow
```

This saves **~80% of tokens** compared to the old JSON output. The AI can read and summarise a 20-issue table in a fraction of the cost.

Pass `--json` to any command to get structured JSON (useful for scripting or when the AI needs to extract specific nested fields).

## Local sprint cache (`sprint.md`)

Run `node scripts/jira-api.mjs sync` to fetch the current sprint and write it to `sprint.md`. The Cursor rule tells the AI to **read sprint.md first** before making any API calls. This means:

- Most "what are my tasks?" questions cost **zero API calls**
- The AI reads a small markdown file instead of parsing JSON from the network
- After any write (assign, transition, etc.) the AI runs `sync` to keep it fresh

Add `sprint.md` to your `.gitignore` — it's a local cache, not source code.

## Suggested models

| Model | Best for | Notes |
|-------|----------|-------|
| **Gemini 3 Flash** | Speed + daily use | Fast, follows rules well, great with compact text |
| **Sonnet 4.5** | Complex multi-step tasks | Excellent reasoning, reliable tool use |
| **Claude 3.5 Sonnet** | All-round | Reliable rule-following, concise summaries |
| **GPT-4o** | Fast + capable | Good JSON parsing, fast responses |

**Recommendation:** Use **Gemini 3 Flash** for quick lookups and **Sonnet 4.5** for complex operations (multi-step transitions, subtask creation, etc.).

## How the rule triggers

The rule uses `alwaysApply: false` — it only loads when Cursor detects Jira-related intent (e.g. "tasks", "issues", "sprint", "DPH", "subtasks"). This saves tokens on every non-Jira conversation.

## Customising

- **Project key:** The rule and `sprint` command use `DPH`. Edit `.cursor/rules/jira-tasks.mdc` and the default JQL in `jira-api.mjs` to use your project key.
- **Sprint field:** Default is `customfield_10106`. Check your Jira instance if sprints aren't showing.
- **Sync JQL:** Pass custom JQL to `sync` to cache different issue sets.

## Requirements

- Node 18+
- Jira Cloud (e.g. `your-domain.atlassian.net`)
