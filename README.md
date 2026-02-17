# Connect Cursor to Jira (no MCP)

Use Jira from Cursor via a script and API token. No Atlassian MCP app or site-admin approval needed.

## What’s in this folder

- **`scripts/jira-api.mjs`** — Node script to list tasks, get issues, assign (uses Jira REST API).
- **`.env.example`** — Template for your Jira credentials (domain, email, API token).
- **`.cursor/rules/jira-tasks.mdc`** — Cursor rule so the AI uses the script when you ask about tasks.

## Setup (for your team)

### 1. Copy into your project

Merge this folder into your **project root**:

- Copy **`scripts/`** into your repo (so you have `scripts/jira-api.mjs`).
- Copy **`.cursor/rules/jira-tasks.mdc`** into your repo’s **`.cursor/rules/`** (create `.cursor/rules/` if needed).
- Copy **`.env.example`** to your project root.

Your repo should look like:

```
your-project/
  scripts/
    jira-api.mjs
  .cursor/
    rules/
      jira-tasks.mdc
  .env.example
  .env          ← you create this in step 2
```

### 2. Add your Jira credentials (each person does this once)

1. Create an API token: [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. In the **project root**, copy the example and add your values:
   ```bash
   cp .env.example .env
   ```
3. Edit **`.env`** and set:
   ```
   JIRA_DOMAIN=datacomgroup
   JIRA_EMAIL=your.email@datacom.com
   JIRA_API_TOKEN=your-token-here
   ```
4. Ensure **`.env`** is in `.gitignore` so it’s never committed.

### 3. Test

From the project root:

```bash
node scripts/jira-api.mjs me
node scripts/jira-api.mjs search "project = DPH ORDER BY updated DESC"
```

### 4. Use in Cursor

In Cursor chat you can ask:

- “What are my Jira tasks?”
- “Show my DPH issues”
- “Get details for DPH-123”
- “Assign DPH-123 to …”

The rule tells Cursor to run the script and use the output. Run all commands from the **project root** so `.env` is loaded.

## Customising the project key

The rule uses **DPH** as the Jira project key. To use another project, edit **`.cursor/rules/jira-tasks.mdc`** and replace `DPH` with your project key in the example commands and JQL.

## Requirements

- Node 18+ (for `fetch`).
- Jira Cloud site (e.g. `datacomgroup.atlassian.net`).
# cursor-to-jira-integration
