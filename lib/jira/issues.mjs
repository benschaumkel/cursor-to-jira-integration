/**
 * Jira issue CRUD operations.
 */

import { validateKey } from '../utils.mjs'

/**
 * Fetch a single issue by key.
 */
export async function getIssue(client, key, opts = {}) {
  const validated = validateKey(key)
  const { fields } = opts
  const qs = fields ? `?fields=${fields.join(',')}` : ''
  return client.requestJson(
    `/rest/api/3/issue/${validated}${qs}`,
    {},
    `get ${validated}`,
  )
}

/**
 * Create a new issue.
 */
export async function createIssue(client, fields) {
  return client.requestJson(
    '/rest/api/3/issue',
    {
      method: 'POST',
      body: JSON.stringify({ fields }),
    },
    'create',
  )
}

/**
 * Update an existing issue's fields.
 */
export async function updateIssue(client, key, fields) {
  const validated = validateKey(key)
  const res = await client.request(
    `/rest/api/3/issue/${validated}`,
    {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    },
  )
  if (!res.ok) {
    const { ApiError } = await import('../errors.mjs')
    throw await ApiError.fromResponse(res, `update ${validated}`)
  }
  return validated
}

/**
 * Assign an issue to a user by accountId.
 */
export async function assignIssue(client, key, accountId) {
  const validated = validateKey(key)
  const res = await client.request(
    `/rest/api/3/issue/${validated}/assignee`,
    {
      method: 'PUT',
      body: JSON.stringify({ accountId }),
    },
  )
  if (!res.ok) {
    const { ApiError } = await import('../errors.mjs')
    throw await ApiError.fromResponse(res, `assign ${validated}`)
  }
  return validated
}

/**
 * Add a comment using Atlassian Document Format.
 */
export async function addComment(client, key, text) {
  const validated = validateKey(key)
  return client.requestJson(
    `/rest/api/3/issue/${validated}/comment`,
    {
      method: 'POST',
      body: JSON.stringify({
        body: {
          type: 'doc',
          version: 1,
          content: [
            { type: 'paragraph', content: [{ type: 'text', text }] },
          ],
        },
      }),
    },
    `comment ${validated}`,
  )
}

/**
 * Create a subtask under a parent issue.
 */
export async function createSubtask(client, parentKey, summary, accountId) {
  const validParent = validateKey(parentKey)

  // Fetch parent to determine project
  const parent = await getIssue(client, validParent, {
    fields: ['project'],
  })

  const fields = {
    project: { key: parent.fields.project.key },
    parent: { key: validParent },
    summary,
    issuetype: { name: 'Subtask' },
  }
  if (accountId) fields.assignee = { accountId }

  return client.requestJson(
    '/rest/api/3/issue',
    {
      method: 'POST',
      body: JSON.stringify({ fields }),
    },
    `create-subtask under ${validParent}`,
  )
}
