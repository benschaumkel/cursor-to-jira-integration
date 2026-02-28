# Cursor × Jira Integration

Talk to Jira directly from Cursor chat — see your tasks, update statuses, and browse Confluence pages, all without leaving your editor.

**No MCP server. No admin approval. No extra software.** Just a script and an API token.

---

## What does this do?

Once set up, you can open Cursor and type things like:

> *"What are my Jira tasks?"*
> *"Move ABC-123 to In Progress"*
> *"Show me the current sprint board"*
> *"Find the Confluence page about onboarding"*

Cursor's AI reads your tasks directly from Jira and responds in plain English.

---

## Before you start

You need two things installed on your computer:

1. **Node.js** (version 18 or newer)
   - Check if you have it: open Terminal and type `node --version`
   - If you see a number like `v20.x.x`, you're good
   - If not, download it from [nodejs.org](https://nodejs.org) — click the big green "LTS" button and install it like any other app

2. **Cursor** — [cursor.com](https://cursor.com) (you probably already have this)

> **What is Terminal?**
> It's a text-based app on your computer. On Mac: press `Cmd + Space`, type "Terminal", press Enter. On Windows: press `Win`, type "Terminal" or "PowerShell", press Enter.

---

## Setup — 4 steps

### Step 1 — Copy this folder into your project

In Terminal, navigate to your project folder, then run:

```bash
# If you downloaded/cloned this repo already:
cp -r cursor-jira-integration/scripts ./scripts
mkdir -p .cursor/rules
cp cursor-jira-integration/.cursor/rules/jira-tasks.mdc .cursor/rules/
cp cursor-jira-integration/.env.example ./.env.example
```

> **New to Terminal navigation?**
> `cd` means "change directory". Example: `cd ~/Desktop/my-project`
> `ls` shows what's in the current folder. Use it to check you're in the right place.

After this step, your project should look like:

```
your-project/
├── scripts/
│   ├── jira-api.mjs          ← the main script
│   ├── jira-helpers.sh       ← shortcut commands (optional)
│   ├── confluence-helpers.sh ← Confluence shortcuts (optional)
│   └── env.sh                ← shared config loader
├── .cursor/
│   └── rules/
│       └── jira-tasks.mdc    ← tells Cursor how to use Jira
└── .env.example              ← template for your credentials
```

---

### Step 2 — Create your `.env` file

This file holds your Jira credentials. It stays on your computer and is **never committed to Git**.

```bash
cp .env.example .env
```

Now open `.env` in any text editor and fill in your details:

```
JIRA_DOMAIN=your-company        ← e.g. "acme" if your Jira URL is acme.atlassian.net
JIRA_EMAIL=you@yourcompany.com  ← the email you log into Jira with
JIRA_API_TOKEN=paste-token-here ← see below for how to get this
```

**How to get your API token:**

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **"Create API token"**
3. Give it a name (e.g. "Cursor") and click **"Create"**
4. Copy the token shown — paste it into your `.env` file
5. Click **"Close"** (you won't be able to see the token again, but that's fine)

> **Why do I need a token?**
> It's like a password that lets the script read your Jira data without you typing your password every time. Keep it secret — don't share it or commit it to Git.

**Make sure `.env` is in your `.gitignore`** to prevent accidentally sharing your token:

```bash
echo ".env" >> .gitignore
```

---

### Step 3 — Test your connection

In Terminal, from your project folder:

```bash
node scripts/jira-api.mjs me
```

If everything is set up correctly, you'll see your name and Jira account ID printed out. That means it's working.

**Common errors:**

| Error | What it means | Fix |
|-------|--------------|-----|
| `command not found: node` | Node.js isn't installed | Install from [nodejs.org](https://nodejs.org) |
| `HTTP 401` | Wrong token or email | Double-check your `.env` |
| `HTTP 404` | Wrong domain | Check `JIRA_DOMAIN` in `.env` |
| `Cannot find module` | Wrong folder | Make sure you're running from your project root |

---

### Step 4 — Load the sprint cache (optional but recommended)

This downloads your current sprint to a local file (`sprint.md`) so Cursor can answer sprint questions instantly without making API calls every time:

```bash
node scripts/jira-api.mjs sync
```

Run this whenever you want to refresh the data (e.g. at the start of each day).

---

## Using it in Cursor

Open Cursor chat and just ask naturally:

| What you type | What happens |
|--------------|-------------|
| "What are my Jira tasks?" | Shows your open tasks sorted by priority |
| "What's in the current sprint?" | Reads from sprint.md (zero API calls) |
| "Show me DPH-123" | Fetches that specific issue |
| "Move ABC-45 to In Progress" | Updates the issue status |
| "Assign ABC-45 to me" | Assigns the issue to you |
| "Create a subtask on ABC-123 for writing tests" | Creates a new subtask |
| "Find the Confluence page about deployments" | Searches your Confluence |
| "Show me the children of that page" | Lists sub-pages |
| "Sync my sprint" | Refreshes sprint.md |

> **Tip:** The AI rule only activates when it detects Jira-related words ("tasks", "sprint", "issues", your project key). It doesn't load on every message — this saves tokens.

---

## Shell shortcuts (optional)

If you prefer typing short commands in Terminal instead of asking Cursor, source the helper scripts:

```bash
source scripts/jira-helpers.sh
```

You'll get commands like:

```bash
jira-morning          # Start your day: cache status + tasks + sprint
jira-my-tasks         # My open tasks
jira-sprint           # Current sprint board
jira-get ABC-123      # Single issue detail
jira-start ABC-123    # Move to In Progress
jira-done ABC-123     # Move to Done
jira-review ABC-123   # Move to Ready for Review
jira-sync             # Refresh sprint.md
jira-whoami           # Your account ID (needed for assign)
```

**To make these available every time you open Terminal**, add this line to your `~/.zshrc` (Mac) or `~/.bashrc`:

```bash
source /path/to/your-project/scripts/jira-helpers.sh
```

Then run `source ~/.zshrc` to apply it immediately.

### Confluence shortcuts

```bash
conf-search "query"        # Search Confluence by content
conf-browse "page title"   # Find a page by title + see its children
conf-recent                # Recently updated pages
conf-my-pages              # Pages you've contributed to
conf-children <id or url>  # Child pages of a given page
conf-tree <id or url>      # Visual tree of nested pages
conf-spaces                # List all spaces
conf-space-pages IA        # Pages in the IA space
```

---

## All commands

### Jira — Read

| Command | Example | What it does |
|---------|---------|-------------|
| `my` | `node scripts/jira-api.mjs my` | Your open tasks (sorted by priority) |
| `sprint` | `node scripts/jira-api.mjs sprint` | Current sprint issues |
| `get` | `node scripts/jira-api.mjs get ABC-123` | Single issue detail |
| `batch` | `node scripts/jira-api.mjs batch ABC-1 ABC-2` | Multiple issues in 1 call |
| `subtasks` | `node scripts/jira-api.mjs subtasks ABC-100` | Children of a story |
| `search` | `node scripts/jira-api.mjs search "project = ABC AND status = 'To Do'"` | Custom JQL search |
| `me` | `node scripts/jira-api.mjs me` | Your account info |
| `sync` | `node scripts/jira-api.mjs sync` | Cache sprint → sprint.md |

### Jira — Write

> Cursor will ask you to confirm before running any of these.

| Command | Example | What it does |
|---------|---------|-------------|
| `transition` | `node scripts/jira-api.mjs transition ABC-1 "In Progress"` | Change status |
| `assign` | `node scripts/jira-api.mjs assign ABC-1 <accountId>` | Assign to someone |
| `comment` | `node scripts/jira-api.mjs comment ABC-1 "Done, please review"` | Add a comment |
| `create-subtask` | `node scripts/jira-api.mjs create-subtask ABC-1 "Write tests"` | Create a subtask |
| `update` | `node scripts/jira-api.mjs update ABC-1 '{"summary":"New title"}'` | Edit fields |

### Confluence — Read

| Command | Example | What it does |
|---------|---------|-------------|
| `recent` | `node scripts/jira-api.mjs recent` | Recently updated pages |
| `my-pages` | `node scripts/jira-api.mjs my-pages` | Pages you've contributed to |
| `conf-search` | `node scripts/jira-api.mjs conf-search "onboarding"` | Search by content |
| `browse` | `node scripts/jira-api.mjs browse "onboarding"` | Find by title + show children |
| `page-info` | `node scripts/jira-api.mjs page-info 123456` | Info about a page |
| `children` | `node scripts/jira-api.mjs children 123456` | Child pages |
| `page-tree` | `node scripts/jira-api.mjs page-tree 123456` | Visual nested tree |
| `spaces` | `node scripts/jira-api.mjs spaces` | All Confluence spaces |
| `space-pages` | `node scripts/jira-api.mjs space-pages IA` | Pages in a space |

### Flags (add to any command)

| Flag | What it does |
|------|-------------|
| `--limit 10` or `-n 10` | Cap the number of results |
| `--json` | Full JSON output (for scripting or debugging) |
| `--no-sync` | Skip the auto-sync after write commands |

---

## How the sprint cache works

When you run `node scripts/jira-api.mjs sync`, it:
1. Fetches your current sprint from Jira
2. Writes a compact summary to `sprint.md`
3. Saves cache metadata to `.sprint-meta.json`

Cursor reads `sprint.md` first before making any API calls. This means most "what's in the sprint?" questions cost **zero API calls** and respond instantly.

The cache auto-invalidates after any write (assign, transition, etc.) and Cursor runs `sync` to keep it fresh.

Add both files to `.gitignore` — they're local cache, not source code:

```
sprint.md
.sprint-meta.json
```

---

## Customising for your project

**Change the project key** (default is `DPH`):
- Open `.cursor/rules/jira-tasks.mdc` in any text editor
- Find references to `DPH` and replace with your project key (e.g. `ABC`)
- Also update the default JQL in `scripts/jira-api.mjs` (search for `DPH`)

**Sprint field ID:**
The default is `customfield_10106`. If sprints aren't showing, ask your Jira admin for the correct field ID for your instance.

---

## Recommended models

| Model | Best for |
|-------|---------|
| **Gemini 2.0 Flash** | Daily use — fast, cheap, great at following the rule |
| **Claude Sonnet** | Complex multi-step tasks (subtask creation, bulk transitions) |
| **GPT-4o** | Fast + reliable JSON parsing |

---

## Requirements

- Node.js 18 or newer
- Jira Cloud (`your-domain.atlassian.net`)
- A Jira API token (free, takes 2 minutes to create)
