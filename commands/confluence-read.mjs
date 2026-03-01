/**
 * All Confluence read commands.
 */

import { searchContent, buildCql } from '../lib/confluence/search.mjs'
import { getPage, getChildren, getPageTree } from '../lib/confluence/pages.mjs'
import { listSpaces } from '../lib/confluence/spaces.mjs'
import { resolvePageId } from '../lib/utils.mjs'
import {
  formatSpaceList,
  formatConfluenceResults,
  formatPageInfo,
  formatChildPages,
  formatPageTree,
  formatBrowseResult,
  formatRecentDocs,
  formatSpacePages,
  formatMyPages,
} from '../lib/formatters/text.mjs'

export const confluenceCommands = [
  {
    name: 'spaces',
    async execute({ flags, client }) {
      const limit = flags.limit || 25
      const data = await listSpaces(client, { limit })
      const spaces = data.results || []

      if (flags.json) {
        console.log(
          JSON.stringify(
            spaces.map((s) => ({
              key: s.key,
              name: s.name,
              type: s.type,
              url: `${client.config.wikiUrl}/spaces/${s.key}`,
            })),
            null,
            2,
          ),
        )
      } else {
        console.log(formatSpaceList(spaces, client.config.wikiUrl))
      }
    },
  },

  {
    name: 'conf-search',
    async execute({ args, flags, client }) {
      if (!args[0]) throw new Error('Usage: conf-search "search terms"')

      const limit = flags.limit || 15
      const cql = buildCql(args[0])
      const data = await searchContent(client, cql, {
        limit,
        expand: 'space,history.lastUpdated,children.page',
      })
      const results = data.results || []

      if (!results.length) {
        console.log(`No Confluence pages matched: "${args[0]}"`)
        return
      }

      if (flags.json) {
        console.log(
          JSON.stringify(
            results.map((r) => ({
              id: r.id,
              title: r.title,
              space: r.space?.key,
              childCount: r.children?.page?.size || 0,
              url: `${client.config.wikiUrl}${r._links.webui}`,
            })),
            null,
            2,
          ),
        )
      } else {
        console.log(
          formatConfluenceResults(results, client.config.wikiUrl),
        )
      }
    },
  },

  {
    name: 'browse',
    async execute({ args, flags, client }) {
      if (!args[0]) throw new Error('Usage: browse "search terms"')

      const cql = `type = page AND title ~ "${args[0]}" ORDER BY lastmodified DESC`
      const searchData = await searchContent(client, cql, {
        limit: 5,
        expand: 'space,children.page,ancestors',
      })
      const results = searchData.results || []

      if (!results.length) {
        console.log(`No pages matched: "${args[0]}"`)
        return
      }

      const page = results[0]
      const otherResults = results.slice(1)
      let childPages = []

      const kids = page.children?.page?.size || 0
      if (kids > 0) {
        const childData = await getChildren(client, page.id)
        childPages = childData.results || []
      }

      if (flags.json) {
        console.log(
          JSON.stringify(
            {
              page: {
                id: page.id,
                title: page.title,
                space: page.space?.key,
                url: `${client.config.wikiUrl}${page._links.webui}`,
              },
              otherMatches: otherResults.map((r) => ({
                id: r.id,
                title: r.title,
              })),
              children: childPages.map((p) => ({
                id: p.id,
                title: p.title,
                childCount: p.children?.page?.size || 0,
              })),
            },
            null,
            2,
          ),
        )
      } else {
        console.log(
          formatBrowseResult(page, otherResults, childPages, client.config.wikiUrl),
        )
      }
    },
  },

  {
    name: 'page-info',
    async execute({ args, flags, client }) {
      if (!args[0]) throw new Error('Usage: page-info <pageId or URL>')

      const page = await getPage(client, args[0])

      if (flags.json) {
        console.log(JSON.stringify(page, null, 2))
      } else {
        console.log(formatPageInfo(page, client.config.wikiUrl))
      }
    },
  },

  {
    name: 'children',
    async execute({ args, flags, client }) {
      if (!args[0]) throw new Error('Usage: children <pageId or URL>')

      const pageId = resolvePageId(args[0])
      const parent = await getPage(client, pageId, {
        expand: 'space',
      })
      const data = await getChildren(client, pageId, {
        limit: flags.limit || 25,
      })
      const pages = data.results || []

      if (flags.json) {
        console.log(
          JSON.stringify(
            pages.map((p) => ({
              id: p.id,
              title: p.title,
              childCount: p.children?.page?.size || 0,
              updated: p.history?.lastUpdated?.when,
              url: `${client.config.wikiUrl}${p._links?.webui || ''}`,
            })),
            null,
            2,
          ),
        )
      } else {
        console.log(
          formatChildPages(parent, pages, client.config.wikiUrl),
        )
      }
    },
  },

  {
    name: 'page-tree',
    async execute({ args, flags, client }) {
      if (!args[0]) throw new Error('Usage: page-tree <pageId or URL>')

      const pageId = resolvePageId(args[0])
      const maxDepth = flags.limit || 2

      const root = await getPage(client, pageId, {
        expand: 'space,children.page',
      })

      const rootKids = root.children?.page?.size || 0
      if (rootKids === 0) {
        if (flags.json) {
          console.log(
            JSON.stringify({ id: root.id, title: root.title, children: [] }, null, 2),
          )
        } else {
          console.log(
            formatPageTree(root.title, root.space?.key, root.id, []),
          )
        }
        return
      }

      const tree = await getPageTree(client, pageId, maxDepth)

      if (flags.json) {
        console.log(JSON.stringify({ id: root.id, title: root.title, children: tree }, null, 2))
      } else {
        console.log(
          formatPageTree(root.title, root.space?.key, root.id, tree),
        )
      }
    },
  },

  {
    name: 'space-pages',
    async execute({ args, flags, client }) {
      if (!args[0]) throw new Error('Usage: space-pages <SPACE-KEY>')

      const spaceKey = (args[0] || '').toUpperCase()
      const limit = flags.limit || 20
      const cql = `space = "${spaceKey}" AND type = page ORDER BY lastmodified DESC`

      const data = await searchContent(client, cql, {
        limit,
        expand: 'history.lastUpdated',
      })
      const results = data.results || []

      if (flags.json) {
        console.log(
          JSON.stringify(
            results.map((r) => ({
              id: r.id,
              title: r.title,
              updated: r.history?.lastUpdated?.when,
              url: `${client.config.wikiUrl}${r._links.webui}`,
            })),
            null,
            2,
          ),
        )
      } else {
        console.log(
          formatSpacePages(spaceKey, results, client.config.wikiUrl),
        )
      }
    },
  },

  {
    name: 'my-pages',
    async execute({ flags, client }) {
      const limit = flags.limit || 10
      const cql =
        'contributor = currentUser() AND type = page ORDER BY lastmodified DESC'

      const data = await searchContent(client, cql, {
        limit,
        expand: 'space,history.lastUpdated',
      })
      const results = data.results || []

      if (flags.json) {
        console.log(
          JSON.stringify(
            results.map((r) => ({
              id: r.id,
              title: r.title,
              space: r.space?.key,
              updated: r.history?.lastUpdated?.when,
              url: `${client.config.wikiUrl}${r._links.webui}`,
            })),
            null,
            2,
          ),
        )
      } else {
        console.log(formatMyPages(results, client.config.wikiUrl))
      }
    },
  },

  {
    name: 'recent',
    async execute({ flags, client }) {
      const limit = flags.limit || 10
      const cql = 'type=page order by lastModified desc'

      const data = await searchContent(client, cql, { limit })
      const results = data.results || []

      if (flags.json) {
        console.log(JSON.stringify(results, null, 2))
      } else {
        console.log(formatRecentDocs(results, client.config.wikiUrl))
      }
    },
  },
]
