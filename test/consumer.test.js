// A throwaway repo that installs this package (as a node_modules symlink) and
// extends it the way the real repos do, then runs the real tools against it.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { verify } from '../lib/verify.js'

const ROOT = path.resolve(import.meta.dirname, '..')
const tool = (/** @type {string} */ name) => path.join(ROOT, 'node_modules/.bin', name)

/** @type {string} */
let dir

/**
 * @param {string} name
 * @param {string | object} content
 */
function write(name, content) {
  mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
  writeFileSync(
    path.join(dir, name),
    typeof content === 'string' ? content : JSON.stringify(content),
  )
}

/**
 * @param {string} bin
 * @param {string[]} args
 */
function run(bin, ...args) {
  return spawnSync(tool(bin), args, { cwd: dir, encoding: 'utf8' })
}

before(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'consumer-'))
  mkdirSync(path.join(dir, 'node_modules/@ebalzan'), { recursive: true })
  symlinkSync(ROOT, path.join(dir, 'node_modules/@ebalzan/config'))
  write('package.json', {
    name: 'consumer',
    type: 'module',
    prettier: '@ebalzan/config/prettier',
    devDependencies: { '@ebalzan/config': '0.1.0' },
  })
  write(
    'eslint.config.js',
    `import node from '@ebalzan/config/eslint/node'\nexport default [...node, { rules: { 'no-console': 'error' } }]\n`,
  )
  write('tsconfig.json', {
    extends: '@ebalzan/config/tsconfig/node.json',
    compilerOptions: { outDir: 'dist', rootDir: 'src' },
    include: ['src/**/*.ts'],
  })
  write('tsconfig.build.json', '{\n  // comments are fine\n  "extends": "./tsconfig.json",\n}\n')
  write('src/index.ts', 'export const greeting = "hi";\n')
})

after(() => rmSync(dir, { recursive: true, force: true }))

test('prettier applies the shared rules from the package.json string', () => {
  const result = run('prettier', 'src/index.ts')
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, "export const greeting = 'hi'\n")
})

test('eslint resolves the preset and keeps the repo override', () => {
  const result = run('eslint', '--print-config', 'src/index.ts')
  assert.equal(result.status, 0, result.stderr)
  const { rules } = JSON.parse(result.stdout)
  assert.equal(rules['no-console'][0], 2)
  assert.ok(rules['@typescript-eslint/no-unused-vars'], 'typescript-eslint rules present')
  assert.ok(rules['no-undef'], 'js recommended rules present')
})

test('tsc merges the shared compiler options under the repo paths', () => {
  const result = run('tsc', '-p', 'tsconfig.build.json', '--showConfig')
  assert.equal(result.status, 0, result.stderr)
  const { compilerOptions } = JSON.parse(result.stdout)
  assert.equal(compilerOptions.strict, true)
  assert.equal(compilerOptions.module, 'nodenext')
  assert.equal(compilerOptions.outDir, './dist')
})

test('verify passes a repo that extends everything', async () => {
  const failed = (await verify(dir)).filter(r => !r.ok)
  assert.deepEqual(failed, [])
})

test('verify fails a repo that copies instead of extending', async () => {
  write('.prettierrc.json', { semi: false })
  write('tsconfig.json', { compilerOptions: { strict: true } })
  try {
    const failed = (await verify(dir)).filter(r => !r.ok).map(r => r.area)
    assert.deepEqual(failed, ['prettier', 'typescript', 'typescript'])
  } finally {
    rmSync(path.join(dir, '.prettierrc.json'))
    write('tsconfig.json', { extends: '@ebalzan/config/tsconfig/node.json' })
  }
})
