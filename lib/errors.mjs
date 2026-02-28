/**
 * Structured error types for clear error handling paths.
 */

export class ApiError extends Error {
  constructor(status, detail, context = '') {
    const prefix = context ? `${context}: ` : ''
    const hint =
      status === 401
        ? ' — regenerate token at https://id.atlassian.com/manage-profile/security/api-tokens'
        : ''
    super(`${prefix}HTTP ${status}${detail ? ' — ' + detail : ''}${hint}`)
    this.name = 'ApiError'
    this.status = status
  }

  /**
   * Build an ApiError from a failed fetch Response.
   */
  static async fromResponse(res, context = '') {
    let detail = ''
    try {
      const body = await res.json()
      detail =
        body?.errorMessages?.join('; ') ||
        body?.message ||
        ''
    } catch {
      try {
        detail = (await res.text()).slice(0, 200)
      } catch {
        /* empty */
      }
    }
    return new ApiError(res.status, detail, context)
  }
}

export class ConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConfigError'
  }
}
