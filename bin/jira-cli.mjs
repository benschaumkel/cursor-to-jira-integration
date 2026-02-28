#!/usr/bin/env node

/**
 * Thin entry point. Loads environment, resolves config,
 * builds the client, and delegates to the command router.
 */

import 'dotenv/config'

import { loadConfig } from '../lib/config.mjs'
import { createClient } from '../lib/client.mjs'
import { parseArgs, HELP_TEXT } from '../lib/cli.mjs'
import { registry } from '../commands/index.mjs'

async function main() {
  const parsed = parseArgs(process.argv)

  if (parsed.flags.help || !parsed.command) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  // ── Resolve config + profile ─────────────────────────
  let config
  try {
    config = loadConfig(parsed.flags.profile)
  } catch (err) {
    console.error(`Configuration error: ${err.message}`)
    process.exit(1)
  }

  // ── Build API client ─────────────────────────────────
  let client
  try {
    client = createClient(config)
  } catch (err) {
    console.error(`Client error: ${err.message}`)
    process.exit(1)
  }

  // ── Dispatch command ─────────────────────────────────
  const handler = registry.get(parsed.command)
  if (!handler) {
    console.error(`Unknown command: ${parsed.command}`)
    console.error(`Run with --help to see available commands.`)
    process.exit(1)
  }

  try {
    await handler.execute({
      args: parsed.args,
      flags: parsed.flags,
      client,
      config,
    })
  } catch (err) {
    console.error(err.message || err)
    process.exitCode = 1
  }
}

main()
