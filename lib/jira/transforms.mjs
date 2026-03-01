/**
 * Jira response transformers.
 *
 * These reduce noisy Jira API responses to something
 * useful for both human-readable and machine-readable output.
 */

const NOISE_FIELDS = new Set([
  'avatarUrls',
  'self',
  'iconUrl',
  'expand',
  'renderedFields',
  'statusCategory',
  'hierarchyLevel',
  'entityId',
  'scope',
])

/**
 * Recursively strip Jira noise from a response object.
 *
 * By default, assignee/status/priority objects are KEPT as objects
 * so that accountId is available for scripting. The formatters
 * decide how to display them.
 *
 * @param {any} obj                 The raw Jira response
 * @param {object} opts
 * @param {boolean} opts.stripDescription  Remove description field
 * @param {boolean} opts.flatten           Flatten identity objects to names
 */
export function slim(obj, opts = {}) {
  const { stripDescription = false, flatten = false } = opts
  return _slim(obj, stripDescription, flatten)
}

function _slim(obj, stripDescription, flatten) {
  if (Array.isArray(obj)) {
    return obj.map((v) => _slim(v, stripDescription, flatten))
  }

  if (obj && typeof obj === 'object') {
    const out = {}
    for (const [key, val] of Object.entries(obj)) {
      if (NOISE_FIELDS.has(key)) continue
      if (stripDescription && key === 'description') continue

      if (flatten) {
        if (key === 'assignee' && val && typeof val === 'object') {
          out.assignee = val.displayName || val.accountId || null
          out.assigneeAccountId = val.accountId || null
          continue
        }
        if (key === 'status' && val && typeof val === 'object') {
          out[key] = val.name || val
          continue
        }
        if (key === 'priority' && val && typeof val === 'object') {
          out[key] = val.name || val
          continue
        }
        if (key === 'issuetype' && val && typeof val === 'object') {
          out[key] = val.name || val
          continue
        }
      }

      const slimmedVal = _slim(val, stripDescription, flatten)
      if (slimmedVal !== undefined) {
        out[key] = slimmedVal
      }
    }
    return out
  }

  return obj
}

/**
 * Extract plain text from Jira Atlassian Document Format.
 */
export function extractText(node) {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.text) return node.text
  if (node.content) {
    return node.content
      .map(extractText)
      .filter(Boolean)
      .join(node.type === 'doc' ? '\n' : '')
  }
  return ''
}
