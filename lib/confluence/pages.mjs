/**
 * Confluence page operations.
 */

import { resolvePageId } from '../utils.mjs'

/**
 * Get a single page by ID with expanded metadata.
 */
export async function getPage(client, idOrUrl, opts = {}) {
  const id = resolvePageId(idOrUrl)
  const expand =
    opts.expand ||
    'space,ancestors,children.page,history.lastUpdated'

  return client.requestJson(
    `/wiki/rest/api/content/${id}?expand=${encodeURIComponent(expand)}`,
    { headers: { Accept: 'application/json' } },
    'page-info',
  )
}

/**
 * Get child pages of a parent.
 */
export async function getChildren(client, idOrUrl, opts = {}) {
  const id = resolvePageId(idOrUrl)
  const { limit = 25 } = opts

  return client.requestJson(
    `/wiki/rest/api/content/${id}/child/page` +
      `?limit=${limit}` +
      `&expand=history.lastUpdated,children.page`,
    { headers: { Accept: 'application/json' } },
    'children',
  )
}

/**
 * Recursively build a page tree.
 *
 * @param {object} client
 * @param {string} pageId     Root page ID
 * @param {number} maxDepth   How deep to recurse (1-based)
 * @returns {object[]}        Nested tree structure
 */
export async function getPageTree(client, pageId, maxDepth = 2) {
  async function recurse(id, depth) {
    if (depth > maxDepth) return []

    const data = await getChildren(client, id)
    const pages = data.results || []

    const tree = []
    for (const page of pages) {
      const childCount = page.children?.page?.size || 0
      const node = {
        id: page.id,
        title: page.title,
        childCount,
        updatedWhen: page.history?.lastUpdated?.when,
        children: [],
      }
      if (depth < maxDepth && childCount > 0) {
        node.children = await recurse(page.id, depth + 1)
      }
      tree.push(node)
    }
    return tree
  }

  return recurse(pageId, 1)
}
