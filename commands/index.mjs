/**
 * Command registry.
 *
 * Each command module exports one or more command definitions
 * which get collected here into a single Map keyed by name.
 */

import { jiraReadCommands } from './jira-read.mjs'
import { jiraWriteCommands } from './jira-write.mjs'
import { jiraSyncCommands } from './jira-sync.mjs'
import { confluenceCommands } from './confluence-read.mjs'

export const registry = new Map()

const allCommands = [
  ...jiraReadCommands,
  ...jiraWriteCommands,
  ...jiraSyncCommands,
  ...confluenceCommands,
]

for (const cmd of allCommands) {
  if (registry.has(cmd.name)) {
    throw new Error(`Duplicate command registration: ${cmd.name}`)
  }
  registry.set(cmd.name, cmd)
}
