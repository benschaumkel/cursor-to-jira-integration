/**
 * CLI argument parser.
 *
 * Uses Node 18.3+ built-in parseArgs where possible,
 * with a thin wrapper for our command structure:
 *
 *   jira-cli [--profile name] <command> [args...] [--json] [--limit N]
 */

import { parseArgs as nodeParseArgs } from 'node:util'

/**
 * @param {string[]} argv  process.argv
 * @returns {{ command: string|null, args: string[], flags: object }}
 */
export function parseArgs(argv) {
  const raw = argv.slice(2)

  // Pre-scan for known flags before handing to parseArgs
  const { values, positionals } = nodeParseArgs({
    args: raw,
    options: {
      json: { type: 'boolean', default: false },
      raw: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      limit: { type: 'string', short: 'n' },
      profile: { type: 'string', short: 'p' },
      project: { type: 'string' },
      space: { type: 'string', short: 's' },
      type: { type: 'string' },
      priority: { type: 'string' },
    },
    strict: false,
    allowPositionals: true,
  })

  const command = positionals[0] || null
  const args = positionals.slice(1)

  // Normalize limit to integer
  let limit = null
  if (values.limit !== undefined) {
    limit = parseInt(values.limit, 10)
    if (!Number.isInteger(limit) || limit <= 0) {
      console.error('Invalid --limit value: must be a positive integer.')
      process.exit(1)
    }
  }

  return {
    command,
    args,
    flags: {
      json: values.json || values.raw || false,
      help: values.help || false,
      limit,
      profile: values.profile || null,
      project: values.project || null,
      space: values.space || null,
      type: values.type || null,
      priority: values.priority || null,
    },
  }
}

export const HELP_TEXT = `
Usage: jira-cli [--profile <name>] <command> [args] [--json] [--limit N]

  Global Flags:
    --profile, -p <name>   Use a named profile from config.yaml
    --json                 Output raw JSON instead of formatted text
    --limit, -n <N>        Max results to return
    --help, -h             Show this help message

  Jira — Read:
    me                     Show current user info
    my [jql]               My open issues (or custom JQL)
    sprint [jql]           Current sprint board
    search <jql>           Search issues with JQL
    get <KEY>              Get full issue detail
    batch <KEY> [KEY...]   Get multiple issues
    subtasks <KEY>         List subtasks of a parent

  Jira — Write:
    create <summary>       Create issue  [--type Task] [--priority High] [--project KEY]
    assign <KEY> <acctId>  Assign issue(s) to a user
    transition <KEY> <st>  Transition issue(s) to a status
    update <KEY> '{json}'  Update issue fields
    comment <KEY> "text"   Add a comment
    create-subtask <KEY> <summary> [acctId]

  Jira — Sync:
    sync [jql]             Regenerate sprint.md from Jira

  Confluence:
    spaces                 List Confluence spaces
    conf-search <query>    Search Confluence pages
    browse <query>         Browse page + children
    page-info <id|URL>     Page metadata
    children <id|URL>      List child pages
    page-tree <id|URL>     Recursive page tree [--limit depth]
    space-pages <SPACEKEY> List pages in a space
    my-pages               Pages you've contributed to
    recent                 Recently modified pages

  User:
    find-user <query>      Search Atlassian users

  Examples:
    jira-cli my
    jira-cli sprint --limit 50
    jira-cli get DPH-1234 --json
    jira-cli create "Fix login bug" --type Bug --priority High
    jira-cli --profile secondary search "project = OC"
    jira-cli conf-search "onboarding" --space ENG
`.trim()
