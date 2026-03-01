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
node bin/jira-cli.mjs get DPH-123
jira get DPH-123
jira get DPH-123 --json
```

### Multiple issues at once

```bash
node bin/jira-cli.mjs batch DPH-1 DPH-2 DPH-3
jira batch DPH-1 DPH-2 DPH-3
```

### Subtasks of a parent issue

```bash
node bin/jira-cli.mjs subtasks DPH-100
jira subtasks DPH-100
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
jira create "Broken auth flow" --type Bug --priority Highest --project DPH
```

### Create a subtask

```bash
node bin/jira-cli.mjs create-subtask DPH-100 "Write unit tests"
jira create-subtask DPH-100 "Update docs"
```

### Transition (change status)

```bash
node bin/jira-cli.mjs transition DPH-123 "In Progress"
jira transition DPH-123 "Done"
jira transition DPH-123 "Ready for Review"
jira transition DPH-1 DPH-2 DPH-3 "In Progress"    # bulk
```

### Assign an issue

```bash
# First, find the user's account ID:
jira find-user "Sarah"

# Then assign:
node bin/jira-cli.mjs assign DPH-123 <accountId>
jira assign DPH-1 DPH-2 <accountId>                 # bulk
```

### Update fields

```bash
node bin/jira-cli.mjs update DPH-123 '{"summary":"New title"}'
jira update DPH-123 '{"priority":{"name":"High"}}'
```

### Add a comment

```bash
node bin/jira-cli.mjs comment DPH-123 "Blocked by API changes"
jira comment DPH-123 "Ready for QA"
```

---

## Jira — Sync

### Refresh the local sprint cache

```bash
node bin/jira-cli.mjs sync
jira sync
```

This regenerates `sprint.md` and `.sprint-meta.json` from the Jira API.

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
jira conf-search "release notes" --space IA
```

### Browse a page (top match + children)

```bash
node bin/jira-cli.mjs browse "standup notes"
jira browse "architecture"
```

### Page metadata

```bash
node bin/jira-cli.mjs page-info 40737570863
jira page-info "https://datacomgroup.atlassian.net/wiki/spaces/IA/pages/40737570863"
```

### List child pages

```bash
node bin/jira-cli.mjs children 40737570863
jira children 40737570863
```

### Recursive page tree

```bash
node bin/jira-cli.mjs page-tree 40737570863
jira page-tree 40737570863 --limit 3    # depth limit
```

### Pages in a space

```bash
node bin/jira-cli.mjs space-pages IA
jira space-pages IA --limit 30
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
jira transition DPH-123 "In Progress"
jira transition DPH-123 "Ready for Review"
jira transition DPH-123 "Done"
```

### Find and assign work

```bash
jira search "status = 'To Do' AND priority = High"
jira find-user "Ben"
jira assign DPH-456 <accountId>
jira transition DPH-456 "In Progress"
```

### Explore Confluence documentation

```bash
jira spaces
jira space-pages IA
jira browse "project hub"
jira page-tree 40737570863 --limit 2
```
