/**
 * Confluence search via CQL.
 */

/**
 * Search Confluence content using CQL.
 *
 * @param {object} client
 * @param {string} cql         Raw CQL or simple search terms
 * @param {object} opts
 * @param {number} opts.limit
 * @param {string} opts.expand  Comma-separated expand fields
 */
export async function searchContent(client, cql, opts = {}) {
  const { limit = 15, expand = 'space,history.lastUpdated' } = opts

  return client.requestJson(
    `/wiki/rest/api/content/search` +
      `?cql=${encodeURIComponent(cql)}` +
      `&limit=${limit}` +
      `&expand=${encodeURIComponent(expand)}`,
    { headers: { Accept: 'application/json' } },
    'confluence search',
  )
}

/**
 * Build CQL from simple search terms or pass through raw CQL.
 */
export function buildCql(query) {
  const isRawCql = /\b(AND|OR|=|~|IN)\b/i.test(query)
  if (isRawCql) return query

  return (
    `type = page AND (title ~ "${query}" OR text ~ "${query}") ` +
    `ORDER BY lastmodified DESC`
  )
}
