/**
 * Jira search operations — all JQL-based queries.
 */

/**
 * Execute a JQL search with pagination awareness.
 *
 * @param {object} client        Client from createClient()
 * @param {string} jql           JQL query string
 * @param {object} opts
 * @param {number} opts.maxResults
 * @param {string[]} opts.fields
 * @returns {object}             { issues, total, startAt, maxResults }
 */
export async function searchJql(client, jql, opts = {}) {
  const { maxResults = 50, fields } = opts

  return client.requestJson(
    '/rest/api/3/search/jql',
    {
      method: 'POST',
      body: JSON.stringify({
        jql,
        maxResults,
        ...(fields ? { fields } : {}),
      }),
    },
    'search',
  )
}

/**
 * Paginated search — fetches ALL results up to maxTotal.
 * Use for sync operations where you need the full dataset.
 */
export async function searchJqlAll(client, jql, opts = {}) {
  const { maxTotal = 200, fields, pageSize = 50 } = opts
  const allIssues = []
  let startAt = 0

  while (allIssues.length < maxTotal) {
    const data = await client.requestJson(
      '/rest/api/3/search/jql',
      {
        method: 'POST',
        body: JSON.stringify({
          jql,
          startAt,
          maxResults: Math.min(pageSize, maxTotal - allIssues.length),
          ...(fields ? { fields } : {}),
        }),
      },
      'search (paginated)',
    )

    allIssues.push(...(data.issues || []))

    if (allIssues.length >= data.total || !data.issues?.length) break
    startAt = allIssues.length
  }

  return { issues: allIssues, total: allIssues.length }
}
