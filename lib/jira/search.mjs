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
 * Uses nextPageToken cursor pagination (Jira v3 search/jql endpoint).
 */
export async function searchJqlAll(client, jql, opts = {}) {
  const { maxTotal = 200, fields, pageSize = 50 } = opts
  const allIssues = []
  let nextPageToken = null

  while (allIssues.length < maxTotal) {
    const body = {
      jql,
      maxResults: Math.min(pageSize, maxTotal - allIssues.length),
      ...(fields ? { fields } : {}),
      ...(nextPageToken ? { nextPageToken } : {}),
    }

    const data = await client.requestJson(
      '/rest/api/3/search/jql',
      { method: 'POST', body: JSON.stringify(body) },
      'search (paginated)',
    )

    allIssues.push(...(data.issues || []))

    if (data.isLast || !data.nextPageToken || !data.issues?.length) break
    nextPageToken = data.nextPageToken
  }

  return { issues: allIssues, total: allIssues.length }
}
