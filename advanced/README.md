# Advanced — Terminal Command Reference

Direct `node` commands for developers who want to interact with Jira and Confluence from the terminal.

---

## Alias Setup (optional)

To avoid typing `node bin/jira-cli.mjs` every time:

```bash
source advanced/setup-alias.sh
```

This gives you a `jira` shortcut. To make it permanent:

```bash
echo "source $(pwd)/advanced/setup-alias.sh" >> ~/.zshrc
```

All examples below show both forms. Use whichever you prefer.

---

## Global Flags

These work with any command:

```bash
--profile, -p <name>   # Use a named profile from config.yaml
--json                  # Output raw JSON instead of formatted text
--limit, -n <N>        # Max results to return
--help, -h             # Show help
```

---

## Jira — Read

### My open issues

```bash
node bin/jira-cli.mjs my
jira my
jira my --limit 5
jira my --json
```

### Current sprint board

```bash
node bin/jira-cli.mjs sprint
jira sprint
jira sprint --limit 50
```

### Single issue detail

```bash
node bin/jira-cli.mjs get PROJ-123
jira get PROJ-123
jira get PROJ-123 --json
```

### Multiple issues at once

```bash
node bin/jira-cli.mjs batch PROJ-1 PROJ-2 PROJ-3
jira batch PROJ-1 PROJ-2 PROJ-3
```

### Subtasks of a parent issue

```bash
node bin/jira-cli.mjs subtasks PROJ-100
jira subtasks PROJ-100
```

### Search with JQL

```bash
node bin/jira-cli.mjs search "status = 'In Progress' AND assignee = currentUser()"
jira search "priority = High AND statusCategory != Done"
jira search "labels = 'backend' ORDER BY updated DESC"
jira search "issuetype = Bug AND created >= -7d"
```

### Who am I

```bash
node bin/jira-cli.mjs me
jira me
```

### Look up a user

```bash
node bin/jira-cli.mjs find-user "Sarah"
jira find-user "Sarah"
```

---

## Jira — Write

### Create an issue

```bash
node bin/jira-cli.mjs create "Fix login bug" --type Bug --priority High
jira create "Set up staging environment"
jira create "Write API docs" --type Task
jira create "Broken auth flow" --type Bug --priority Highest --project PROJ
```

### Create a subtask

```bash
node bin/jira-cli.mjs create-subtask PROJ-100 "Write unit tests"
jira create-subtask PROJ-100 "Update docs"
```

### Transition (change status)

```bash
node bin/jira-cli.mjs transition PROJ-123 "In Progress"
jira transition PROJ-123 "Done"
jira transition PROJ-123 "Ready for Review"
jira transition PROJ-1 PROJ-2 PROJ-3 "In Progress"    # bulk
```

### Assign an issue

```bash
# First, find the user's account ID:
jira find-user "Sarah"

# Then assign:
node bin/jira-cli.mjs assign PROJ-123 <accountId>
jira assign PROJ-1 PROJ-2 <accountId>                 # bulk
```

### Update fields

```bash
node bin/jira-cli.mjs update PROJ-123 '{"summary":"New title"}'
jira update PROJ-123 '{"priority":{"name":"High"}}'
```

### Add a comment

```bash
node bin/jira-cli.mjs comment PROJ-123 "Blocked by API changes"
jira comment PROJ-123 "Ready for QA"
```

---

## Jira — Sync

### Refresh the local sprint cache

```bash
node bin/jira-cli.mjs sync
jira sync
```

This regenerates `workspace/sprint-board.md` and `.sprint-meta.json` from the Jira API.

---

## Confluence

### List spaces

```bash
node bin/jira-cli.mjs spaces
jira spaces
```

### Search pages

```bash
node bin/jira-cli.mjs conf-search "onboarding"
jira conf-search "QA test plan"
jira conf-search "release notes" --space ENG
```

### Browse a page (top match + children)

```bash
node bin/jira-cli.mjs browse "standup notes"
jira browse "architecture"
```

### Page metadata

```bash
node bin/jira-cli.mjs page-info 123456789
jira page-info "https://yourcompany.atlassian.net/wiki/spaces/ENG/pages/123456789"
```

### List child pages

```bash
node bin/jira-cli.mjs children 123456789
jira children 123456789
```

### Recursive page tree

```bash
node bin/jira-cli.mjs page-tree 123456789
jira page-tree 123456789 --limit 3    # depth limit
```

### Pages in a space

```bash
node bin/jira-cli.mjs space-pages IA
jira space-pages ENG --limit 30
```

### Pages you've contributed to

```bash
node bin/jira-cli.mjs my-pages
jira my-pages
```

### Recently modified pages

```bash
node bin/jira-cli.mjs recent
jira recent --limit 20
```

---

## Multi-Profile Usage

If you have multiple Atlassian instances configured in `config.yaml`:

```bash
jira --profile secondary sprint
jira --profile secondary search "project = OC"
```

---

## Common Workflows

### Morning check-in

```bash
jira my --limit 10
jira sprint
```

### Move a task through its lifecycle

```bash
jira transition PROJ-123 "In Progress"
jira transition PROJ-123 "Ready for Review"
jira transition PROJ-123 "Done"
```

### Find and assign work

```bash
jira search "status = 'To Do' AND priority = High"
jira find-user "Ben"
jira assign PROJ-456 <accountId>
jira transition PROJ-456 "In Progress"
```

### Explore Confluence documentation

```bash
jira spaces
jira space-pages ENG
jira browse "project hub"
jira page-tree 123456789 --limit 2
```
