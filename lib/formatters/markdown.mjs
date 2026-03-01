/**
 * Markdown generators — produces sprint.md and similar artifacts.
 */

/**
 * Generate sprint.md content from Jira issues.
 *
 * @param {object} opts
 * @param {object[]} opts.issues       Array of Jira issue objects
 * @param {string}   opts.sprintName   Sprint name for the heading
 * @param {string}   opts.browseUrl    Base URL for issue links
 * @param {string[]} opts.statusOrder  Preferred status ordering
 * @returns {string}                   Complete Markdown document
 */
export function generateSprintMarkdown(opts) {
  const {
    issues,
    sprintName = 'Current Sprint',
    browseUrl,
    statusOrder = [],
  } = opts

  const now = new Date()
  const ts = now.toISOString().replace('T', ' ').slice(0, 16)

  // Group by status
  const groups = {}
  for (const issue of issues) {
    const status = issue.fields?.status?.name || 'Unknown'
    if (!groups[status]) groups[status] = []
    groups[status].push(issue)
  }

  // Sort groups by configured status order
  const sortedStatuses = Object.keys(groups).sort((a, b) => {
    const ai = statusOrder.indexOf(a)
    const bi = statusOrder.indexOf(b)
    const aIdx = ai === -1 ? 99 : ai
    const bIdx = bi === -1 ? 99 : bi
    return aIdx - bIdx
  })

  const lines = [`# ${sprintName}`, `> Last synced: ${ts}`, '']

  for (const status of sortedStatuses) {
    const grp = groups[status]
    lines.push(`## ${status} (${grp.length})`)
    lines.push('')
    lines.push('| Key | Priority | Assignee | Summary |')
    lines.push('|-----|----------|----------|---------|')

    for (const issue of grp) {
      const f = issue.fields || {}
      const pri = f.priority?.name || ''
      const who = f.assignee?.displayName || 'Unassigned'
      const parent = f.parent ? ` ^${f.parent.key}` : ''
      const keyLink = `[${issue.key}](${browseUrl}/browse/${issue.key})`
      lines.push(
        `| ${keyLink} | ${pri} | ${who} | ${f.summary || ''}${parent} |`,
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate the .sprint-meta.json content.
 */
export function generateSprintMeta(issues, sprintName) {
  const now = new Date()
  return JSON.stringify({
    syncedAt: now.getTime(),
    syncedAtISO: now.toISOString(),
    ttlMs: 14_400_000,
    issueCount: issues.length,
    sprintName,
    valid: true,
  }, null, 2)
}
