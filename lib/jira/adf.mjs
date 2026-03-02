/**
 * Converts plain text to Atlassian Document Format (ADF).
 *
 * Supports:
 *   - Headings: lines starting with 1–6 "#" characters
 *   - Numbered list items: lines starting with "N. text"
 *   - Bullet list items: lines starting with "- text" or "* text"
 *   - Blank lines as paragraph separators
 *   - All other lines become paragraphs
 *
 * List type switches (numbered → bullet or vice versa) flush the
 * current list before starting the new one.
 */
export function textToAdf(text) {
  const lines = text.split('\n')
  const content = []
  let currentList = null

  function flushList() {
    if (!currentList) return
    const node = { type: currentList.type, content: currentList.items }
    if (currentList.type === 'orderedList') node.attrs = { order: 1 }
    content.push(node)
    currentList = null
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)/)
    const numbered = line.match(/^\d+\.\s+(.+)/)
    const bulleted = line.match(/^[-*]\s+(.+)/)

    if (heading) {
      flushList()
      content.push({
        type: 'heading',
        attrs: { level: heading[1].length },
        content: [{ type: 'text', text: heading[2] }],
      })
    } else if (numbered) {
      if (currentList?.type !== 'orderedList') flushList()
      if (!currentList) currentList = { type: 'orderedList', items: [] }
      currentList.items.push(makeListItem(numbered[1]))
    } else if (bulleted) {
      if (currentList?.type !== 'bulletList') flushList()
      if (!currentList) currentList = { type: 'bulletList', items: [] }
      currentList.items.push(makeListItem(bulleted[1]))
    } else {
      flushList()
      if (line.trim()) {
        content.push({ type: 'paragraph', content: [{ type: 'text', text: line }] })
      }
    }
  }

  flushList()

  return {
    type: 'doc',
    version: 1,
    content: content.length ? content : [{ type: 'paragraph', content: [] }],
  }
}

function makeListItem(text) {
  return {
    type: 'listItem',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}
