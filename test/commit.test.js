import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { checkSubject, isExemptSubject } from '../commit/index.js'

const BIN = new URL('../bin/ebalzan-config.js', import.meta.url).pathname

function cli(...args) {
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' })
}

test('accepts Conventional Commit subjects', () => {
  for (const subject of [
    'feat: add filters',
    'fix(viewer): prevent crash',
    'refact(api)!: drop v1 routes',
    'chore(deps): update dev tooling',
  ]) {
    assert.equal(checkSubject(subject), null, subject)
  }
})

test('rejects anything else', () => {
  for (const subject of ['', 'add filters', 'feature: add filters', 'feat:no space', 'feat(): x']) {
    assert.match(checkSubject(subject), /^Invalid commit message/, subject)
  }
})

test('labels the message', () => {
  assert.match(checkSubject('nope', 'PR title'), /^Invalid PR title: "nope"/)
})

test('exempts subjects git writes', () => {
  assert.ok(isExemptSubject('Merge branch dev into main'))
  assert.ok(isExemptSubject('Revert "feat: x"'))
  assert.ok(isExemptSubject('fixup! feat: x'))
  assert.ok(!isExemptSubject('Merged things'))
})

test('commit-msg checks only the first line of the file', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'commit-msg-'))
  const file = path.join(dir, 'COMMIT_EDITMSG')

  writeFileSync(file, 'feat: ok\n\nbody that is not a subject\n')
  assert.equal(cli('commit-msg', file).status, 0)

  writeFileSync(file, 'wip\n')
  const bad = cli('commit-msg', file)
  assert.equal(bad.status, 1)
  assert.match(bad.stderr, /Invalid commit message: "wip"/)

  writeFileSync(file, 'Merge branch dev\n')
  assert.equal(cli('commit-msg', file).status, 0)
})

test('check-subject exits non-zero on an invalid subject', () => {
  assert.equal(cli('check-subject', 'fix: ok').status, 0)
  assert.equal(cli('check-subject', 'nope', 'PR title').status, 1)
})
