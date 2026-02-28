/**
 * Human-readable text formatters for terminal output.
 *
 * No Jira API knowledge here — only presentation.
 */

// ── Column / time helpers ────────────────────────────────

export function col(str, width) {
  return (str || '').slice(0, width).padEnd(width)
}

export function relTime(dateStr) {
  if (!dateStr) return ''
  const ms = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return `${Math.floor(d / 7)}w`
}

// ── Jira formatters ──────────────────────────────────────

export function formatIssueList(data, title = 'Results') {
  const issues = data.issues || []
  if (!issues.length) return 'No issues found.'

  const total = data.total > issues.length ? ` of ${data.total}` : ''
  const lines = [
    `${title} — ${issues.length}${total} issues`,
    '',
    `${col('KEY', 11)}${col('STATUS', 18)}${col('PRIORITY', 13)}${col('AGE', 5)}SUMMARY`,
  ]

  for (const issue of issues) {
    const f = issue.fields || {}
    lines.push(
      `${col(issue.key, 11)}` +
        `${col(f.status?.name || '', 18)}` +
        `${col(f.priority?.name || '', 13)}` +
        `${col(relTime(f.updated), 5)}` +
        `${f.summary || ''}`,
    )
  }

  return lines.join('\n')
}

export function formatIssueDetail(issue, extractTextFn) {
  const f = issue.fields || {}
  const lines = []

  lines.push(`${issue.key} — ${f.summary || ''}`)
  lines.push(
    `Status: ${f.status?.name || '?'}  |  ` +
      `Priority: ${f.priority?.name || '?'}  |  ` +
      `Type: ${f.issuetype?.name || '?'}`,
  )

  const sprint = f.customfield_10106
  if (sprint) {
    lines.push(
      `Sprint: ${typeof sprint === 'object' ? sprint.name : sprint}`,
    )
  }

  if (f.parent) {
    lines.push(
      `Parent: ${f.parent.key}` +
        (f.parent.fields?.summary ? ` — ${f.parent.fields.summary}` : ''),
    )
  }

  lines.push(`Assignee: ${f.assignee?.displayName || 'Unassigned'}`)
  lines.push(`Updated: ${relTime(f.updated)} (${f.updated || '?'})`)

  if (f.labels?.length) lines.push(`Labels: ${f.labels.join(', ')}`)
  if (f.components?.length) {
    lines.push(`Components: ${f.components.map((c) => c.name).join(', ')}`)
  }
  if (f.fixVersions?.length) {
    lines.push(`Fix versions: ${f.fixVersions.map((v) => v.name).join(', ')}`)
  }

  const desc = extractTextFn ? extractTextFn(f.description) : ''
  if (desc.trim()) {
    lines.push('', desc.trim().slice(0, 600))
  }

  if (f.subtasks?.length) {
    lines.push('', `Subtasks (${f.subtasks.length}):`)
    for (const st of f.subtasks) {
      const sf = st.fields || {}
      lines.push(
        `  ${col(st.key, 11)}${col(sf.status?.name || '', 18)}${sf.summary || ''}`,
      )
    }
  }

  return lines.join('\n')
}

export function formatUser(user) {
  return [
    `${user.displayName} <${user.emailAddress || ''}>`,
    `Account: ${user.accountId}`,
    `Active: ${user.active}`,
  ].join('\n')
}

export function formatUserList(users) {
  if (!users.length) return 'No users found.'
  return users
    .map(
      (u) =>
        `${u.displayName} — ${u.accountId}` +
        (u.emailAddress ? ` <${u.emailAddress}>` : ''),
    )
    .join('\n')
}

// ── Confluence formatters ────────────────────────────────

export function formatSpaceList(spaces, wikiUrl) {
  if (!spaces.length) return 'No spaces found.'
  const lines = [`Confluence Spaces (${spaces.length}):`, '']
  for (const s of spaces) {
    lines.push(`  ${s.key.padEnd(10)} ${s.name}`)
  }
  return lines.join('\n')
}

export function formatConfluenceResults(results, wikiUrl) {
  if (!results.length) return 'No pages found.'
  const lines = [`Confluence Search — ${results.length} results:`, '']
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const kids = r.children?.page?.size || 0
    const icon = kids > 0 ? `📂 (${kids} pages)` : '📄'
    lines.push(`  ${i + 1}. ${icon} ${r.title}`)
    lines.push(
      `     Space: ${r.space?.key || ''}  |  ` +
        `Updated: ${relTime(r.history?.lastUpdated?.when)}  |  ` +
        `ID: ${r.id}`,
    )
    lines.push(`     ${wikiUrl}${r._links.webui}`)
    lines.push('')
  }
  return lines.join('\n')
}

export function formatPageInfo(page, wikiUrl) {
  const ancestors = (page.ancestors || []).map((a) => a.title)
  const breadcrumb = ancestors.length
    ? ancestors.join(' → ') + ' → ' + page.title
    : page.title

  return [
    `📄 ${page.title}`,
    `   ID: ${page.id}`,
    `   Space: ${page.space?.key} (${page.space?.name || ''})`,
    `   Path: ${breadcrumb}`,
    `   Children: ${page.children?.page?.size || 0} pages`,
    `   Updated: ${relTime(page.history?.lastUpdated?.when)} by ${page.history?.lastUpdated?.by?.displayName || '?'}`,
    `   URL: ${wikiUrl}${page._links.webui}`,
  ].join('\n')
}

export function formatChildPages(parent, pages, wikiUrl) {
  if (!pages.length) return `📂 ${parent.title} — no child pages.`

  const lines = [
    `📂 ${parent.title} (${parent.space?.key}) — ${pages.length} child pages:`,
    '',
  ]

  for (const p of pages) {
    const kids = p.children?.page?.size || 0
    lines.push(`  ${kids > 0 ? `📂 (${kids})` : '📄'} ${p.title}`)
    lines.push(
      `     Updated: ${relTime(p.history?.lastUpdated?.when)}  |  ID: ${p.id}`,
    )
    lines.push(`     ${wikiUrl}${p._links.webui}`)
    lines.push('')
  }

  return lines.join('\n')
}

export function formatPageTree(rootTitle, rootSpaceKey, rootId, tree) {
  const lines = [`📂 ${rootTitle}  (${rootSpaceKey}, id:${rootId})`]

  if (!tree.length) {
    lines.push('   └── (no child pages)')
    return lines.join('\n')
  }

  function renderLevel(nodes, prefix) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const isLast = i === nodes.length - 1
      const connector = isLast ? '└── ' : '├── '
      const nextPrefix = isLast ? '    ' : '│   '
      const icon = node.childCount > 0 ? '📂' : '📄'

      lines.push(
        `${prefix}${connector}${icon} ${node.title}  ` +
          `(${relTime(node.updatedWhen)}, id:${node.id})`,
      )

      if (node.children?.length) {
        renderLevel(node.children, prefix + nextPrefix)
      }
    }
  }

  renderLevel(tree, '')
  return lines.join('\n')
}

export function formatBrowseResult(page, otherResults, childPages, wikiUrl) {
  const ancestors = (page.ancestors || []).map((a) => a.title)
  const breadcrumb = ancestors.length
    ? ancestors.join(' → ') + ' → ' + page.title
    : page.title

  const lines = [
    `Found: 📂 ${page.title}`,
    `Path:  ${breadcrumb}`,
    `Space: ${page.space?.key} (${page.space?.name || ''})`,
    `ID:    ${page.id}`,
    `URL:   ${wikiUrl}${page._links.webui}`,
    '',
  ]

  if (otherResults.length > 0) {
    lines.push('Also matched:')
    for (let i = 0; i < otherResults.length; i++) {
      const r = otherResults[i]
      lines.push(`  ${i + 2}. ${r.title} (id:${r.id})`)
    }
    lines.push('')
  }

  if (!childPages || !childPages.length) {
    lines.push('This page has no child pages.')
  } else {
    lines.push(`Contents (${childPages.length} pages):`, '')
    for (const p of childPages) {
      const ck = p.children?.page?.size || 0
      lines.push(`  ${ck > 0 ? `📂 (${ck})` : '📄'} ${p.title}`)
      lines.push(
        `     Updated: ${relTime(p.history?.lastUpdated?.when)}  |  ID: ${p.id}`,
      )
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function formatRecentDocs(results, wikiUrl) {
  if (!results.length) return 'No recent documents found.'
  const lines = [`Recent Confluence Documents (${results.length}):`, '']
  for (const doc of results) {
    const link = `${wikiUrl}${doc._links.webui}`
    lines.push(`- ${doc.title}`)
    lines.push(`  ${link}`)
  }
  return lines.join('\n')
}

export function formatSpacePages(spaceKey, results, wikiUrl) {
  if (!results.length) return `No pages in space ${spaceKey}.`
  const lines = [`Pages in ${spaceKey} (${results.length}):`, '']
  for (const r of results) {
    lines.push(
      `  ${col(relTime(r.history?.lastUpdated?.when), 6)}${r.title}`,
    )
    lines.push(`  ${''.padEnd(6)}${wikiUrl}${r._links.webui}`)
    lines.push('')
  }
  return lines.join('\n')
}

export function formatMyPages(results, wikiUrl) {
  if (!results.length) return "No pages found that you've contributed to."
  const lines = [`My Confluence Pages (${results.length}):`, '']
  for (const r of results) {
    lines.push(
      `  ${col(relTime(r.history?.lastUpdated?.when), 6)}` +
        `${col(r.space?.key || '', 8)}${r.title}`,
    )
    lines.push(`  ${''.padEnd(14)}${wikiUrl}${r._links.webui}`)
    lines.push('')
  }
  return lines.join('\n')
}
