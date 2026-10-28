#!/usr/bin/env node
import path from 'node:path'
import { verify } from '../lib/verify.js'

const USAGE = `Usage:
  ebalzan-config verify [dir]   check a repo extends this package (default: .)

Commit messages are checked by @ebalzan/ci (\`ebalzan-ci commit-msg\`).`

const commands = {
  async verify(dir = '.') {
    const results = await verify(path.resolve(dir))
    for (const { area, ok, message } of results) {
      console.log(`${ok ? '✓' : '✗'} ${area.padEnd(10)} ${message}`)
    }
    return results.every(r => r.ok) ? 0 : 1
  },
}

const [command, ...args] = process.argv.slice(2)
const run = commands[/** @type {keyof typeof commands} */ (command)]
if (run) {
  process.exitCode = await run(...args)
} else {
  console.error(USAGE)
  process.exitCode = 1
}
