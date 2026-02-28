/**
 * Jira issue status transitions.
 */

import { validateKey } from '../utils.mjs'
import { ApiError } from '../errors.mjs'

/**
 * Get available transitions for an issue.
 */
export async function getTransitions(client, key) {
  const validated = validateKey(key)
  const data = await client.requestJson(
    `/rest/api/3/issue/${validated}/transitions`,
    {},
    `transitions ${validated}`,
  )
  return data.transitions || []
}

/**
 * Transition an issue to a target status.
 * Finds the matching transition by name (case-insensitive).
 */
export async function transitionIssue(client, key, targetStatus) {
  const validated = validateKey(key)
  const transitions = await getTransitions(client, validated)

  const match = transitions.find(
    (t) => t.name.toLowerCase() === targetStatus.toLowerCase(),
  )

  if (!match) {
    const available = transitions.map((t) => t.name).join(', ')
    throw new Error(
      `${validated}: No "${targetStatus}" transition available. ` +
        `Options: ${available || '(none)'}`,
    )
  }

  const res = await client.request(
    `/rest/api/3/issue/${validated}/transitions`,
    {
      method: 'POST',
      body: JSON.stringify({ transition: { id: match.id } }),
    },
  )

  if (!res.ok) {
    throw await ApiError.fromResponse(res, `transition ${validated}`)
  }

  return { key: validated, name: match.name }
}
