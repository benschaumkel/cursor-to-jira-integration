/**
 * Sprint sync — generates sprint.md from Jira data.
 */

import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { searchJqlAll } from '../lib/jira/search.mjs'
import { atomicWrite } from '../lib/utils.mjs'
import {
  generateSprintMarkdown,
  generateSprintMeta,
} from '../lib/formatters/markdown.mjs'

const SYNC_FIELDS = [
  'summary', 'status', 'priority', 'issuetype', 'assignee',
  'parent', 'updated', 'customfield_10106', 'labels',
]

export const jiraSyncCommands = [
  {
    name: 'sync',
    async execute({ args, flags, client, config }) {
      const project = flags.project || config.jira.defaultProject
      const defaultJql = resolveSprintJql(config.jira.sprintJql, project)
      const jql = args[0] || defaultJql
      const maxTotal = flags.limit || 200

      // Paginated fetch — gets all issues
      const data = await searchJqlAll(client, jql, {
        maxTotal,
        fields: SYNC_FIELDS,
      })

      const issues = data.issues || []
      if (!issues.length) {
        console.log('No issues found for sync.')
        return
      }

      const sprintField = issues[0]?.fields?.customfield_10106
      const sprintObj = Array.isArray(sprintField) ? sprintField[0] : sprintField
      const sprintName = sprintObj?.name || 'Current Sprint'

      // Generate markdown
      const markdown = generateSprintMarkdown({
        issues,
        sprintName,
        browseUrl: config.browseUrl,
        statusOrder: config.jira.statusOrder,
      })

      // Write files atomically
      const root = config.root
      atomicWrite(join(root, 'sprint.md'), markdown)
      writeFileSync(
        join(root, '.sprint-meta.json'),
        generateSprintMeta(issues, sprintName),
      )

      const statusCount = new Set(
        issues.map((i) => i.fields?.status?.name),
      ).size
      console.log(
        `sprint.md updated — ${issues.length} issues, ${statusCount} statuses.`,
      )
    },
  },
]

/**
 * Invalidate the sprint cache after a write operation.
 * Exported so write commands can call it.
 */
export function invalidateSprintCache(config) {
  const metaPath = join(config.root, '.sprint-meta.json')
  if (!existsSync(metaPath)) return

  try {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    meta.valid = false
    meta.invalidatedAt = Date.now()
    writeFileSync(metaPath, JSON.stringify(meta, null, 2))
  } catch {
    /* cache meta missing or corrupt — safe to ignore */
  }
}

function resolveSprintJql(template, project) {
  if (!template) {
    return project
      ? `sprint in openSprints() AND project = ${project} ORDER BY priority ASC, status ASC, key ASC`
      : 'sprint in openSprints() ORDER BY priority ASC, status ASC, key ASC'
  }
  return template.replace(/\$\{project\}/g, project || '')
}
