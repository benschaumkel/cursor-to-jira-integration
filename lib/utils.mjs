/**
 * Shared utilities — no Jira or Confluence domain knowledge here.
 */

import { writeFileSync, renameSync } from 'fs'

// ── Issue key validation ─────────────────────────────────

const ISSUE_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/

export function validateKey(key, label = 'issue key') {
  if (!key || !ISSUE_KEY_RE.test(key.toUpperCase())) {
    throw new Error(`Invalid ${label}: ${key || '(empty)'}`)
  }
  return key.toUpperCase()
}

export function isIssueKey(str) {
  return ISSUE_KEY_RE.test((str || '').toUpperCase())
}

// ── Atomic file write ────────────────────────────────────

export function atomicWrite(filePath, content) {
  const tmp = `${filePath}.tmp.${process.pid}`
  writeFileSync(tmp, content)
  renameSync(tmp, filePath)
}

// ── Concurrency-limited parallel execution ───────────────

export async function parallel(items, fn, concurrency = 5) {
  const results = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    results.push(...(await Promise.allSettled(batch.map(fn))))
  }
  return results
}

// ── Extract Confluence page ID from URL or raw id ────────

export function resolvePageId(input) {
  if (!input) throw new Error('Page ID or URL required')
  const match = input.match(/\/pages\/(\d+)/)
  return match ? match[1] : input
}
