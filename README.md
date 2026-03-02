# Cursor × Jira × Confluence

Talk to Jira and Confluence directly from Cursor chat — in plain English.
No MCP. No admin approval. Just a script, an API token, and a set of Cursor rules.

---

## What you can do

Ask things like:

> "What are my tasks this sprint?"
> "What's blocking the team?"
> "Pull up PROJ-340 — what's the status?"
> "Move that to In Progress"
> "Assign PROJ-249 to Sarah"
> "What's been updated on Confluence this week?"
> "Summarise the QA test plan"

The AI reads your sprint board, fetches issues, reads Confluence pages, and
answers in plain English — no raw JSON, no terminal commands shown to you.

---

## What gets set up for you

On first use, Cursor asks your role (Dev/UX, BA, PO, or PM) and generates
daily workspace files tailored to you:

| File | Who gets it | What's in it |
| --- | --- | --- |
| `my-tasks.md` | Everyone | Your open tasks, grouped by status |
| `workload.md` | Everyone | Today's focus + what's coming up |
| `workspace/sprint-board.md` | Everyone | Full sprint board (cached locally) |
| `refinement.md` | BA | Stories needing AC, flagged for clarification |
| `sprint-health.md` | PO / PM | Sprint goal, % done, blocked & at-risk items |
| `backlog.md` | PO | Top 20 prioritised backlog items |
| `epics.md` | PM | Active epics with progress counts |

These refresh automatically at the start of each day.

---

## Setup — 3 steps

### 1. Install dependencies

Open the terminal in Cursor and run:

```bash
npm install
```

### 2. Configure

Copy the example env file and fill in your details:

```bash
cp .env.example .env
```

Open `.env` and add:

```
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your-token-here
```

Get your API token at: https://id.atlassian.com/manage-profile/security/api-tokens

Then open `config.yaml` and set your company domain and project key:

```yaml
domain: your-company        # e.g. mycompany → mycompany.atlassian.net
default_project: KEY        # e.g. ENG, PROJ
default_space: SPACE        # your main Confluence space key
```

### 3. Test it

```bash
node bin/jira-cli.mjs me
```

If you see your name, you're ready. Open Cursor chat and ask away.

> **Prefer a guided setup?** Just open Cursor chat and type:
> `"Help me set up the Jira integration"` — the AI will walk you through every step.

---

## Commands

Run from project root: `node bin/jira-cli.mjs <command>`

### Jira — Read

| Command | What it does |
| --- | --- |
| `my` | Your open tasks, sorted by priority |
| `sprint` | Current sprint board (reads local cache first) |
| `get KEY-123` | Single issue detail |
| `batch KEY-1 KEY-2 KEY-3` | Multiple issues in one API call |
| `subtasks KEY-123` | Child issues of a parent |
| `search "JQL"` | Custom JQL query |
| `me` | Your Jira profile |
| `find-user "Name"` | Look up a teammate's account |

### Jira — Write

| Command | What it does |
| --- | --- |
| `transition KEY-123 "In Progress"` | Move an issue to a new status |
| `assign KEY-123 KEY-456 <id>` | Assign one or more issues |
| `comment KEY-123 "text"` | Add a comment |
| `update KEY-123 '{"summary":"..."}'` | Edit issue fields |
| `create "Summary" --type Story --priority High` | Create a new issue |
| `create-subtask KEY-123 "Summary"` | Create a subtask |

### Confluence

| Command | What it does |
| --- | --- |
| `recent` | Recently updated pages |
| `conf-search "query"` | Search by keyword (CQL) |
| `spaces` | List available spaces |

### Cache

| Command | What it does |
| --- | --- |
| `sync` | Refresh local sprint board (`workspace/sprint-board.md`) |

---

## How it works

- **Local sprint cache** — `sync` writes your sprint to `workspace/sprint-board.md`. The AI reads this before making any API calls, keeping things fast and token-efficient.
- **Role-based workspace** — daily files are generated based on your role so you only see what's relevant.
- **Write safety** — every write (transition, assign, comment) requires your confirmation before anything happens. The AI also saves a snapshot of the issue's current state to `.jira-history/` before making changes, so you can always see what it looked like before.
- **No raw output** — the AI translates everything into plain English. No JSON, no stack traces, no account IDs.

---

## Requirements

- Node 18+
- Cursor IDE
- Jira Cloud (`your-domain.atlassian.net`)
- Confluence Cloud (optional, same domain)
