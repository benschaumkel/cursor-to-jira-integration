/**
 * Write Jira commands — mutations that modify issues.
 */

import {
  createIssue,
  updateIssue,
  assignIssue,
  addComment,
  createSubtask,
} from '../lib/jira/issues.mjs'
import { transitionIssue } from '../lib/jira/transitions.mjs'
import { validateKey, parallel } from '../lib/utils.mjs'
import { invalidateSprintCache } from './jira-sync.mjs'

export const jiraWriteCommands = [
  {
    name: 'create',
    async execute({ args, flags, client, config }) {
      if (!args[0]) {
        throw new Error(
          'Usage: create "Summary" [--type Task|Story|Bug] [--priority High] [--project KEY]',
        )
      }

      const summary = args[0]
      const project = flags.project || config.jira.defaultProject
      if (!project) {
        throw new Error(
          'No project specified. Use --project KEY or set jira.default_project in config.yaml',
        )
      }

      const fields = {
        project: { key: project },
        summary,
        issuetype: { name: flags.type || 'Task' },
      }
      if (flags.priority) fields.priority = { name: flags.priority }

      const created = await createIssue(client, fields)
      console.log(`Created ${created.key}: ${summary}`)
      invalidateSprintCache(config)
    },
  },

  {
    name: 'assign',
    async execute({ args, client, config }) {
      if (args.length < 2) {
        throw new Error('Usage: assign <key> [key...] <accountId>')
      }

      const accountId = args.at(-1)
      const keys = args.slice(0, -1).map((k) => validateKey(k))

      const results = await parallel(keys, async (key) => {
        await assignIssue(client, key, accountId)
        return key
      })

      let failed = 0
      for (const r of results) {
        if (r.status === 'fulfilled') {
          console.log(`${r.value}: Assigned`)
        } else {
          console.error(r.reason.message)
          failed++
        }
      }

      if (failed) process.exitCode = 1
      invalidateSprintCache(config)
    },
  },

  {
    name: 'update',
    async execute({ args, client, config }) {
      if (!args[0] || !args[1]) {
        throw new Error('Usage: update <key> \'{"field":"value"}\'')
      }

      const key = validateKey(args[0])
      let parsedFields
      try {
        parsedFields = JSON.parse(args[1])
      } catch {
        throw new Error(`Invalid JSON: ${args[1].slice(0, 100)}`)
      }

      await updateIssue(client, key, parsedFields)
      console.log(`Updated ${key}.`)
      invalidateSprintCache(config)
    },
  },

  {
    name: 'transition',
    async execute({ args, client, config }) {
      if (args.length < 2) {
        throw new Error('Usage: transition <key> [key...] <status>')
      }

      const targetStatus = args.at(-1)
      const keys = args.slice(0, -1).map((k) => validateKey(k))

      const results = await parallel(keys, async (key) => {
        return transitionIssue(client, key, targetStatus)
      })

      let failed = 0
      for (const r of results) {
        if (r.status === 'fulfilled') {
          console.log(`${r.value.key}: → ${r.value.name}`)
        } else {
          console.error(r.reason.message)
          failed++
        }
      }

      if (failed) process.exitCode = 1
      invalidateSprintCache(config)
    },
  },

  {
    name: 'comment',
    async execute({ args, client, config }) {
      if (!args[0] || !args[1]) {
        throw new Error('Usage: comment <key> "text"')
      }

      const key = validateKey(args[0])
      await addComment(client, key, args[1])
      console.log(`Comment added to ${key}.`)
      invalidateSprintCache(config)
    },
  },

  {
    name: 'create-subtask',
    async execute({ args, client, config }) {
      if (!args[0] || !args[1]) {
        throw new Error(
          'Usage: create-subtask <parent-key> <summary> [accountId]',
        )
      }

      const parentKey = validateKey(args[0])
      const summary = args[1]
      const accountId = args[2] || null

      const created = await createSubtask(client, parentKey, summary, accountId)
      console.log(`Created ${created.key} under ${parentKey}.`)
      invalidateSprintCache(config)
    },
  },
]
