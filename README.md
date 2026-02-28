# Connect Your Jira and Confluence to Cursor

Talk to Jira and Confluence from inside Cursor — ask about your tasks, move tickets, and search Confluence.

---

## What can I do once this is set up?

Open Cursor and type things like:

- "What are my Jira tasks?"
- "Move ABC-123 to In Progress"
- "Show me the current sprint board"
- "Find the Confluence page about onboarding"

Cursor reads your Jira and replies in plain English.

---

## Setup

### Step 1 — Get your Jira API key

You need a personal key that lets Cursor access your Jira. It takes about a minute.

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Log in with your normal Jira account
3. Click **"Create API token"**
4. Name it something like `Cursor`, then click **"Create"**
5. **Copy the token now** — you won't be able to see it again

Keep it somewhere safe for the next step. Treat it like a password — don't share it.

---

### Step 2 — Download this project

1. On this page, click the green **Code** button → **Download ZIP**
2. Find the ZIP in your Downloads folder and double-click to unzip
3. You'll have a folder called `cursor-jira-integration`

---

### Step 3 — Open it in Cursor

1. Open **Cursor** (download it free from [cursor.com](https://www.cursor.com) if you haven't)
2. Go to **File** → **Open Folder**
3. Select the `cursor-jira-integration` folder
4. Click **Open**

You should see project files in the left sidebar.

---

### Step 4 — Add your Jira details

Open Cursor's chat panel type:

> Create a `.env` file in the root of this project based on `.env.example`. Use these values:
> - JIRA_DOMAIN = `your-company`
> - JIRA_EMAIL = `you@yourcompany.com`
> - JIRA_API_TOKEN = `paste-your-token-here`

Replace the three values with your real details:

| Setting            | How to find it                                                              |
| ------------------ | --------------------------------------------------------------------------- |
| **JIRA_DOMAIN**    | The first part of your Jira URL. `acme.atlassian.net` → use `acme`         |
| **JIRA_EMAIL**     | The email you log into Jira with                                            |
| **JIRA_API_TOKEN** | The key you copied in Step 1                                                |

Click **Accept** when Cursor shows you the new file.

This file stays on your computer only — it's never uploaded or shared.

---

### Step 5 — Install Node.js

The tool needs a free program called Node.js. In the Cursor chat, type:

> Install Node.js on my machine

Cursor will handle the rest. Follow any prompts it gives you.

---

### Step 6 — Check it works

In the Cursor chat, type:

> Run `node scripts/jira-api.mjs me` in the terminal

If it works, you'll see your name and Jira account ID. You're good to go!

If not, here's what common errors mean:

| Error              | Problem                    | Fix                                              |
| ------------------ | -------------------------- | ------------------------------------------------ |
| `HTTP 401`         | Wrong API key or email     | Double-check both values in your `.env` file      |
| `HTTP 404`         | Wrong domain               | `JIRA_DOMAIN` should be just the name, not a URL  |
| `Cannot find module`| Wrong folder open          | Make sure you opened the right folder in Step 3   |

---

## You're done — start asking!

Open the Cursor chat and try these:

| What you type                                      | What happens                        |
| -------------------------------------------------- | ----------------------------------- |
| "What are my Jira tasks?"                          | Shows your open tasks by priority   |
| "What's in the current sprint?"                    | Shows the sprint board              |
| "Show me ABC-123"                                  | Pulls up a specific ticket          |
| "Move ABC-123 to In Progress"                      | Updates the ticket status           |
| "Assign ABC-123 to me"                             | Assigns the ticket to you           |
| "Create a subtask on ABC-123 for writing tests"    | Creates a new subtask               |
| "Find the Confluence page about onboarding"        | Searches your Confluence            |

**Two things to know:**

- Cursor always asks you to confirm before changing anything in Jira.
- Sprint data refreshes automatically when it's more than 4 hours old. You never need to think about it.

---

## One thing to customise

The tool defaults to a project key of `DPH`. Change it to match your team's project key (the letters before your ticket numbers, like `ABC` in `ABC-123`).

Ask Cursor:

> In `.cursor/rules/jira-tasks.mdc` and `scripts/jira-api.mjs`, replace all references to `DPH` with `ABC`

---

## Recommended AI models

| Model              | Best for                                          |
| ------------------ | ------------------------------------------------- |
| Gemini 3.0 Flash   | Day-to-day questions — fast and cheap             |
| Claude Sonnet      | Complex requests like bulk changes or subtasks    |
| Claude Opus        | Everything                                        |

---

## Troubleshooting

**Nothing happens when I ask about Jira**
Make sure you opened the `cursor-jira-integration` folder in Cursor — not a parent folder or different project.

**Sprint data seems out of date**
It should refresh on its own, but you can always say: *"Sync my sprint data"*

**I lost my API token**
No worries. Go back to [the API tokens page](https://id.atlassian.com/manage-profile/security/api-tokens), create a new one, and paste it into your `.env` file.

**I want to use this in my own project folder**
Ask Cursor: *"Copy the scripts folder, .cursor/rules folder, and .env file into my project"*
