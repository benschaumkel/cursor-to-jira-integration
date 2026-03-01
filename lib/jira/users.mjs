/**
 * Jira user operations.
 */

/**
 * Get the currently authenticated user.
 */
export async function getMyself(client) {
  return client.requestJson('/rest/api/3/myself', {}, 'me')
}

/**
 * Search for users by name or email.
 */
export async function findUsers(client, query, maxResults = 10) {
  return client.requestJson(
    `/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    {},
    'find-user',
  )
}
