# Cursor to Jira Integration

Talk to Jira directly from Cursor chat. No MCP, no admin approval — just a script and an API token.

## Setup (3 steps)

### 1. Clone into your project

```bash
cd your-project
git clone https://github.com/your-org/cursor-jira-integration.git
```

Then move the files into place:

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

Open `.env` and fill in your details:

```
JIRA_DOMAIN=datacomgroup
JIRA_EMAIL=your.email@datacom.com
JIRA_API_TOKEN=paste-your-token-here
```

Get your API token here: https://id.atlassian.com/manage-profile/security/api-tokens

Make sure `.env` is in your `.gitignore` — never commit your token.

### 3. Test it

```bash
node scripts/jira-api.mjs me
```

If you see your Jira profile, you're good to go.

## Usage

Just ask Cursor things like:

- "What are my Jira tasks?"
- "Show details for DPH-123"
- "Show me the subtasks of DPH-100"
- "Get DPH-1, DPH-2, and DPH-3"
- "Create a subtask under DPH-123"
- "Move DPH-123 to In Progress"
- "Update the summary on DPH-123"
- "Assign DPH-123 to me"
- "Add a comment to DPH-123"

The Cursor rule handles the rest.

## Available commands

| Command | What it does |
|---------|-------------|
| `me` | Show current user |
| `search "JQL"` | Search issues by JQL |
| `get DPH-123` | Get issue details (filtered fields) |
| `batch DPH-1 DPH-2 DPH-3` | Fetch multiple issues in one API call |
| `subtasks DPH-100` | Get all children of a story/epic |
| `assign DPH-1 DPH-2 <accountId>` | Assign issues (multi-key, continues on failure) |
| `create-subtask DPH-123 "summary" [accountId]` | Create a subtask |
| `update DPH-123 '{"summary":"..."}'` | Edit issue fields |
| `transition DPH-1 DPH-2 "In Progress"` | Change status (multi-key, continues on failure) |
| `comment DPH-123 "text"` | Add a comment |

### Slim output (default)

Output is **slim by default** — noisy Jira fields like `avatarUrls`, `self`, `iconUrl`, `expand`, and `renderedFields` are stripped from every response. This keeps token usage low when Cursor reads the output.

Pass `--raw` to any command to get the full unfiltered Jira response:

```bash
node scripts/jira-api.mjs get DPH-123 --raw
```

## Suggested models

The integration works with any model Cursor supports, but some handle tool-calling rules and JSON output better than others.

| Rank | Model | Best for | Pros | Cons |
|------|-------|----------|------|------|
| 1 | **Claude Sonnet 4** | All-round default | Excellent rule-following, reliable tool use, concise summaries | Moderate cost |
| 2 | **Claude Sonnet 3.5** | Proven reliability | Strong at structured output and multi-step tasks, cheaper than Sonnet 4 | Slightly older, less nuanced on edge cases |
| 3 | **GPT-4o** | Fast + capable | Good JSON parsing, fast responses | Occasionally ignores rule nuances or invents commands |
| 4 | **Gemini 2.5 Pro** | Deep reasoning | Strong at complex JQL and multi-step plans | Verbose responses increase token usage |
| 5 | **Claude Haiku 3.5** | Quick lookups | Very fast, low cost, handles simple queries well | Struggles with multi-step tasks (batch + transition) |
| 6 | **GPT-4o Mini** | Budget option | Cheapest, fine for status checks and transitions | Misses rule subtleties, may skip slim output or loop `get` instead of `batch` |

**Recommendation:** Use **Claude Sonnet 4** or **Sonnet 3.5** for the best experience. They follow the rule table reliably, use `batch`/`subtasks` when appropriate, and summarise JSON output concisely without wasting tokens.

## How the rule triggers

The rule uses `alwaysApply: false` — it only loads when Cursor detects Jira-related intent in your message (e.g. "tasks", "issues", "sprint", "DPH", "subtasks"). This saves ~600 tokens on every non-Jira conversation.

If the rule isn't picking up on your phrasing, you can broaden the trigger by editing the `description` field in `.cursor/rules/jira-tasks.mdc`, or set `alwaysApply: true` to always include it.

## Customising

The rule uses **DPH** as the default project key. To use a different project, edit `.cursor/rules/jira-tasks.mdc` and swap `DPH` for your project key.

## Requirements

- Node 18+
- Jira Cloud (e.g. `datacomgroup.atlassian.net`)
