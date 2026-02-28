/**
 * Configuration loader.
 *
 * Merges config.yaml (structure) with .env (secrets).
 * Supports named profiles for multi-instance Atlassian setups.
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import { ConfigError } from './errors.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

/**
 * Load and validate configuration, returning a resolved profile.
 *
 * @param {string|null} profileName  Explicit profile, or null for default
 * @returns {object} Fully resolved config with auth credentials
 */
export function loadConfig(profileName = null) {
  const raw = loadYaml()
  const profiles = raw?.profiles || {}

  // Determine which profile to use
  const targetName = profileName || profiles.default || 'main'
  const profile = profiles[targetName]

  if (!profile || typeof profile !== 'object') {
    const available = Object.keys(profiles).filter(
      (k) => k !== 'default' && typeof profiles[k] === 'object',
    )
    throw new ConfigError(
      `Profile "${targetName}" not found in config.yaml. ` +
        `Available: ${available.join(', ') || '(none)'}`,
    )
  }

  // Resolve auth from environment variables
  const authCfg = profile.auth || {}
  const emailEnv = authCfg.email_env || 'JIRA_EMAIL'
  const tokenEnv = authCfg.token_env || 'JIRA_API_TOKEN'

  const email = requireEnv(emailEnv)
  const token = requireEnv(tokenEnv)

  // Build resolved config object
  const domain = profile.domain
  if (!domain) {
    throw new ConfigError(
      `Profile "${targetName}" is missing required field: domain`,
    )
  }

  const jiraCfg = profile.jira || {}
  const confluenceCfg = profile.confluence || {}

  return {
    profileName: targetName,
    root: ROOT,

    // Connection
    domain,
    browseDomain: profile.browse_domain || domain,
    baseUrl: `https://${domain}.atlassian.net`,
    wikiUrl: `https://${domain}.atlassian.net/wiki`,
    browseUrl: `https://${(profile.browse_domain || domain)}.atlassian.net`,

    // Auth
    email,
    token,
    authHeader: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,

    // Jira
    jira: {
      defaultProject: jiraCfg.default_project || null,
      projects: (jiraCfg.projects || []).map(normalizeProject),
      sprintJql: jiraCfg.sprint_jql || null,
      myJql: jiraCfg.my_jql || null,
      statusOrder: jiraCfg.status_order || [
        'In Progress',
        'Ready for Review',
        'To Do',
        'Done',
      ],
    },

    // Confluence
    confluence: {
      defaultSpace: confluenceCfg.default_space || null,
      spaces: (confluenceCfg.spaces || []).map(normalizeSpace),
    },
  }
}

/**
 * List all available profile names.
 */
export function listProfiles() {
  const raw = loadYaml()
  const profiles = raw?.profiles
  if (!profiles) return []
  return Object.keys(profiles).filter(
    (k) => k !== 'default' && typeof profiles[k] === 'object',
  )
}

/**
 * Internal helper to load config.yaml.
 */
function loadYaml() {
  const configPath = join(ROOT, 'config.yaml')
  if (!existsSync(configPath)) {
    throw new ConfigError(
      `config.yaml not found at ${configPath}. ` +
        `Copy the example: cp config.yaml.example config.yaml`,
    )
  }
  try {
    return yaml.load(readFileSync(configPath, 'utf8'))
  } catch (err) {
    throw new ConfigError(`Failed to parse config.yaml: ${err.message}`)
  }
}

/**
 * Internal helper to require an environment variable.
 */
function requireEnv(name) {
  const val = process.env[name]
  if (!val || !val.trim()) {
    throw new ConfigError(
      `Required environment variable ${name} is not set. ` +
        `Add it to your .env file (see .env.example).`,
    )
  }
  return val.trim()
}

/**
 * Normalize project config.
 */
function normalizeProject(p) {
  if (typeof p === 'string') return { key: p, name: null }
  return { key: p.key, name: p.name || null }
}

/**
 * Normalize space config.
 */
function normalizeSpace(s) {
  if (typeof s === 'string') return { key: s, name: null }
  return { key: s.key, name: s.name || null }
}
