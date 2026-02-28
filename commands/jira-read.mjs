/**
 * Read-only Jira commands.
 */

import { searchJql } from '../lib/jira/search.mjs'
import { getIssue } from '../lib/jira/issues.mjs'
import { getMyself, findUsers } from '../lib/jira/users.mjs'
import { slim, extractText } from '../lib/jira/transforms.mjs'
import { validateKey, isIssueKey } from '../lib/utils.mjs'
import {
  formatIssueList,
  formatIssueDetail,
  formatUser,
  formatUserList,
} from '../lib/formatters/text.mjs'

// ── Helper: search + display (deduplicates 5 commands) ──

async function searchAndDisplay({ client, jql, fields, title, limit, flags }) {
  const data = await searchJql(client, jql, { maxResults: limit, fields })

  if (flags.json) {
    console.log(JSON.stringify(slim(data, { stripDescription: true }), null, 2))
  } else {
    console.log(formatIssueList(data, title))
  }
}

// ── Standard fields for list views ──────────────────────

const LIST_FIELDS = ['summary', 'status', 'priority', 'assignee', 'updated']
const SPRINT_FIELDS = [...LIST_FIELDS, 'customfield_10106']
const DETAIL_FIELDS = [
  'summary', 'status', 'assignee', 'priority', 'description',
  'issuetype', 'parent', 'subtasks', 'updated', 'labels',
  'components', 'fixVersions', 'customfield_10106',
]

// ── Command definitions ─────────────────────────────────

export const jiraReadCommands = [
  {
    name: 'me',
    async execute({ client, flags }) {
      const user = await getMyself(client)
      if (flags.json) {
        console.log(JSON.stringify(slim(user), null, 2))
      } else {
        console.log(formatUser(user))
      }
    },
  },

  {
    name: 'my',
    async execute({ args, flags, client, config }) {
      const limit = flags.limit || 20
      const defaultJql = resolveJql(
        config.jira.myJql,
        config.jira.defaultProject,
      )
      const jql = args[0] || defaultJql

      await searchAndDisplay({
        client,
        jql,
        fields: LIST_FIELDS,
        title: 'My Tasks',
        limit,
        flags,
      })
    },
  },

  {
    name: 'sprint',
    async execute({ args, flags, client, config }) {
      const limit = flags.limit || 30
      const defaultJql = resolveJql(
        config.jira.sprintJql,
        flags.project || config.jira.defaultProject,
      )
      const jql = args[0] || defaultJql

      await searchAndDisplay({
        client,
        jql,
        fields: SPRINT_FIELDS,
        title: 'Sprint',
        limit,
        flags,
      })
    },
  },

  {
    name: 'search',
    async execute({ args, flags, client }) {
      const jql = args[0] || 'order by updated DESC'
      const limit = flags.limit || 20

      await searchAndDisplay({
        client,
        jql,
        fields: LIST_FIELDS,
        title: 'Search',
        limit,
        flags,
      })
    },
  },

  {
    name: 'get',
    async execute({ args, flags, client }) {
      if (!args[0]) throw new Error('Usage: get <issue-key>')

      const key = validateKey(args[0])
      const fields = flags.json ? undefined : DETAIL_FIELDS
      const issue = await getIssue(client, key, { fields })

      if (flags.json) {
        console.log(JSON.stringify(slim(issue), null, 2))
      } else {
        console.log(formatIssueDetail(issue, extractText))
      }
    },
  },

  {
    name: 'batch',
    async execute({ args, flags, client }) {
      const keys = args.filter(isIssueKey).map((k) => k.toUpperCase())
      if (!keys.length) throw new Error('Usage: batch KEY-1 KEY-2 ...')

      const jql = `key in (${keys.join(',')}) ORDER BY key ASC`
      await searchAndDisplay({
        client,
        jql,
        fields: [...LIST_FIELDS, 'issuetype', 'parent'],
        title: 'Batch',
        limit: keys.length,
        flags,
      })
    },
  },

  {
    name: 'subtasks',
    async execute({ args, flags, client }) {
      if (!args[0]) throw new Error('Usage: subtasks <parent-key>')

      const parentKey = validateKey(args[0])
      const jql = `parent = ${parentKey} ORDER BY status ASC, key ASC`

      await searchAndDisplay({
        client,
        jql,
        fields: LIST_FIELDS,
        title: `Subtasks of ${parentKey}`,
        limit: flags.limit || 50,
        flags,
      })
    },
  },

  {
    name: 'find-user',
    async execute({ args, flags, client }) {
      if (!args[0]) throw new Error('Usage: find-user "display name or email"')

      const users = await findUsers(client, args[0])

      if (flags.json) {
        console.log(
          JSON.stringify(
            users.map((u) => ({
              displayName: u.displayName,
              accountId: u.accountId,
              email: u.emailAddress,
              active: u.active,
            })),
            null,
            2,
          ),
        )
      } else {
        console.log(formatUserList(users))
      }
    },
  },
]

// ── JQL template resolver ────────────────────────────────

function resolveJql(template, project) {
  if (!template) {
    return project
      ? `assignee = currentUser() AND project = ${project} AND statusCategory != Done ORDER BY priority ASC, updated DESC`
      : 'assignee = currentUser() AND statusCategory != Done ORDER BY priority ASC, updated DESC'
  }
  return template.replace(/\$\{project\}/g, project || '')
}
