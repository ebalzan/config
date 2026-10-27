import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).name
const BIN = 'ebalzan-config'

const CODE_EXTS = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts']
// Formats that cannot import anything, so they can only hold a copy of the rules.
const STATIC_PRETTIER = [
  '.prettierrc',
  ...['json', 'json5', 'yaml', 'yml', 'toml'].map(e => `.prettierrc.${e}`),
]
const CODE_PRETTIER = CODE_EXTS.flatMap(e => [`prettier.config.${e}`, `.prettierrc.${e}`])
const LEGACY_ESLINT = [
  '.eslintrc',
  ...['js', 'cjs', 'json', 'yaml', 'yml'].map(e => `.eslintrc.${e}`),
]
const ESLINT = CODE_EXTS.map(e => `eslint.config.${e}`)

/** @typedef {{ area: string, ok: boolean, message: string }} Result */
/**
 * @typedef {object} Manifest
 * @property {string} [prettier]
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [devDependencies]
 */

/** @type {(area: string, message: string) => Result} */
const pass = (area, message) => ({ area, ok: true, message })
/** @type {(area: string, message: string) => Result} */
const fail = (area, message) => ({ area, ok: false, message })

/**
 * @param {string} dir
 * @param {string[]} names
 */
function present(dir, names) {
  return names.filter(name => existsSync(path.join(dir, name)))
}

/**
 * @param {string} dir
 * @param {string} name
 */
function read(dir, name) {
  return readFileSync(path.join(dir, name), 'utf8')
}

/** @param {Manifest} pkg */
function checkDependency(pkg) {
  const declared = { ...pkg.dependencies, ...pkg.devDependencies }[PKG]
  return declared
    ? pass('dependency', `${PKG}@${declared}`)
    : fail('dependency', `add ${PKG} to devDependencies`)
}

/**
 * @param {string} dir
 * @param {Manifest} pkg
 */
function checkPrettier(dir, pkg) {
  const statics = present(dir, STATIC_PRETTIER)
  if (statics.length) {
    return fail('prettier', `${statics.join(', ')} cannot extend ${PKG}; delete it`)
  }
  const shared = `${PKG}/prettier`
  if (pkg.prettier === shared) return pass('prettier', `package.json → ${shared}`)
  if (pkg.prettier !== undefined) {
    return fail('prettier', `package.json "prettier" must be "${shared}"`)
  }
  const files = present(dir, CODE_PRETTIER)
  if (files.length !== 1) {
    return fail(
      'prettier',
      `set package.json "prettier" to "${shared}", or spread it in prettier.config.mjs`,
    )
  }
  return read(dir, files[0]).includes(shared)
    ? pass('prettier', `${files[0]} extends ${shared}`)
    : fail('prettier', `${files[0]} does not import ${shared}`)
}

/** @param {string} dir */
function checkEslint(dir) {
  const legacy = present(dir, LEGACY_ESLINT)
  if (legacy.length)
    return fail('eslint', `${legacy.join(', ')} is legacy config; use eslint.config.*`)
  const files = present(dir, ESLINT)
  if (files.length !== 1)
    return fail('eslint', `expected one eslint.config.*, found ${files.length}`)
  return read(dir, files[0]).includes(`${PKG}/eslint/`)
    ? pass('eslint', `${files[0]} extends ${PKG}/eslint`)
    : fail('eslint', `${files[0]} does not import a ${PKG}/eslint/* preset`)
}

// Whether a tsconfig reaches a shared one through its `extends`, following
// local files (tsconfig.build.json → tsconfig.json → the package).
/**
 * @param {string} file
 * @param {typeof import('typescript')} ts
 * @returns {boolean}
 */
function extendsShared(file, ts, seen = new Set()) {
  if (seen.has(file) || !existsSync(file)) return false
  seen.add(file)
  const { config, error } = ts.readConfigFile(file, ts.sys.readFile)
  if (error) return false
  /** @type {string[]} */
  const parents = [config.extends ?? []].flat()
  return parents.some(parent => {
    if (parent.startsWith(`${PKG}/tsconfig/`)) return true
    if (!parent.startsWith('.')) return false
    const local = path.resolve(path.dirname(file), parent)
    return extendsShared(local.endsWith('.json') ? local : `${local}.json`, ts, seen)
  })
}

/** @param {string} dir */
async function checkTypescript(dir) {
  const files = readdirSync(dir).filter(name => /^tsconfig(\..+)?\.json$/.test(name))
  if (!files.length) return [pass('typescript', 'no tsconfig*.json; skipped')]
  const { default: ts } = await import('typescript')
  return files.map(name =>
    extendsShared(path.join(dir, name), ts)
      ? pass('typescript', `${name} extends ${PKG}/tsconfig`)
      : fail(
          'typescript',
          `${name} must extend ${PKG}/tsconfig/*.json (directly or via a local tsconfig)`,
        ),
  )
}

/** @param {string} dir */
function checkCommitHook(dir) {
  const hook = '.husky/commit-msg'
  if (!existsSync(path.join(dir, hook))) return fail('commit', `${hook} is missing`)
  return read(dir, hook).includes(`${BIN} commit-msg`)
    ? pass('commit', `${hook} runs ${BIN} commit-msg`)
    : fail('commit', `${hook} must run \`npx --no-install ${BIN} commit-msg "$1"\``)
}

/**
 * @param {string} dir
 * @returns {Promise<Result[]>}
 */
export async function verify(dir) {
  const manifest = path.join(dir, 'package.json')
  if (!existsSync(manifest)) return [fail('dependency', `no package.json in ${dir}`)]
  /** @type {Manifest} */
  const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
  return [
    checkDependency(pkg),
    checkPrettier(dir, pkg),
    checkEslint(dir),
    ...(await checkTypescript(dir)),
    checkCommitHook(dir),
  ]
}
