/**
 * HTTP client factory.
 *
 * Creates a client bound to a specific profile's credentials and domain.
 * Handles retry, backoff, rate-limit compliance, and request timeouts.
 */

import { ApiError } from './errors.mjs'

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_RETRIES = 2
const MAX_BACKOFF_MS = 10_000

/**
 * @param {object} config  Resolved config from loadConfig()
 * @returns {object}       Client with .request(), .jira(), .wiki() namespaces
 */
export function createClient(config) {
  const { baseUrl, wikiUrl, authHeader } = config

  /**
   * Core HTTP request with retry, backoff, and timeout.
   *
   * @param {string} path       Absolute URL or path relative to baseUrl
   * @param {object} options    Fetch options (method, body, headers, etc.)
   * @param {number} retries    Max retry attempts
   * @returns {Response}
   */
  async function request(path, options = {}, retries = MAX_RETRIES) {
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      let res
      try {
        res = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: authHeader,
            ...options.headers,
          },
        })
      } catch (err) {
        clearTimeout(timer)

        if (err.name === 'AbortError') {
          if (attempt === retries) {
            throw new ApiError(0, `Request timed out after ${timeoutMs}ms`, url)
          }
          await backoff(attempt)
          continue
        }

        if (attempt === retries) {
          const code = err.cause?.code || ''
          throw new ApiError(
            0,
            `Network error${code ? ` (${code})` : ''} — check connection and domain "${config.domain}"`,
          )
        }
        await backoff(attempt)
        continue
      } finally {
        clearTimeout(timer)
      }

      // Success — return immediately
      if (res.ok) return res

      // Retryable status codes
      if (res.status === 429 || res.status >= 500) {
        if (attempt === retries) return res
        await backoff(attempt, res.headers.get('retry-after'))
        continue
      }

      // Non-retryable error — return immediately for caller to handle
      return res
    }

    // Unreachable in practice, but satisfies control-flow analysis
    throw new ApiError(0, 'Request failed after all retries', url)
  }

  /**
   * Convenience: request + throw on non-OK + parse JSON.
   */
  async function requestJson(path, options = {}, context = '') {
    const res = await request(path, options)
    if (!res.ok) throw await ApiError.fromResponse(res, context)
    return res.json()
  }

  return { request, requestJson, config }
}

// ── Backoff helper ──────────────────────────────────────

async function backoff(attempt, retryAfterHeader = null) {
  let delayMs

  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader)
    if (Number.isFinite(seconds)) {
      delayMs = seconds * 1000
    } else {
      // retry-after can be an HTTP date
      const date = new Date(retryAfterHeader).getTime()
      delayMs = Number.isFinite(date) ? Math.max(0, date - Date.now()) : null
    }
  }

  if (!delayMs || delayMs <= 0) {
    delayMs = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS)
  }

  await new Promise((r) => setTimeout(r, delayMs))
}
