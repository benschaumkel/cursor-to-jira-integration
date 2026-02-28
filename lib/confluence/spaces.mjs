/**
 * Confluence space operations.
 */

/**
 * List available Confluence spaces.
 */
export async function listSpaces(client, opts = {}) {
  const { limit = 25, type = 'global' } = opts

  return client.requestJson(
    `/wiki/rest/api/space?limit=${limit}&type=${type}`,
    { headers: { Accept: 'application/json' } },
    'spaces',
  )
}
