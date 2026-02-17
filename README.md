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
| `get DPH-123` | Get full issue details |
| `assign DPH-123 <accountId>` | Assign an issue |
| `create-subtask DPH-123 "summary" [accountId]` | Create a subtask |
| `update DPH-123 '{"summary":"..."}'` | Edit issue fields |
| `transition DPH-123 "In Progress"` | Change issue status |
| `comment DPH-123 "text"` | Add a comment |

## Customising

The rule uses **DPH** as the default project key. To use a different project, edit `.cursor/rules/jira-tasks.mdc` and swap `DPH` for your project key.

## Requirements

- Node 18+
- Jira Cloud (e.g. `datacomgroup.atlassian.net`)
