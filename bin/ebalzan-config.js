#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { checkSubject, isExemptSubject } from '../commit/index.js'
import { verify } from '../lib/verify.js'

const USAGE = `Usage:
  ebalzan-config commit-msg <file>              check a commit message file (husky commit-msg)
  ebalzan-config check-subject <subject> [label] check one subject line (PR titles)
  ebalzan-config verify [dir]                   check a repo extends this package (default: .)`

/**
 * @param {string | null} problem
 * @returns {number}
 */
function report(problem) {
  if (!problem) return 0
  console.error(problem)
  return 1
}

/** @type {Record<string, (...args: string[]) => number | Promise<number>>} */
const commands = {
  'commit-msg'(file) {
    if (!file) return report(USAGE)
    const subject = readFileSync(file, 'utf8').split('\n', 1)[0]
    return isExemptSubject(subject) ? 0 : report(checkSubject(subject))
  },
  'check-subject'(subject = '', label) {
    return report(checkSubject(subject, label))
  },
  async verify(dir = '.') {
    const results = await verify(path.resolve(dir))
    for (const { area, ok, message } of results) {
      console.log(`${ok ? '✓' : '✗'} ${area.padEnd(10)} ${message}`)
    }
    return results.every(r => r.ok) ? 0 : 1
  },
}

const [command, ...args] = process.argv.slice(2)
const run = commands[command]
process.exitCode = run ? await run(...args) : report(USAGE)
