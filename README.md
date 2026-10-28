# @ebalzan/config

The Prettier, ESLint and TypeScript rules shared by my
repos. Every repo **extends** them and adds only what is its own.
Nothing here is copied into a repo: change a rule here, release, and each repo
picks it up through its Renovate PR.

```sh
npm install --save-dev --save-exact @ebalzan/config eslint prettier typescript
```

`eslint`, `prettier` and `typescript` are peer dependencies, so each repo pins
its own versions. The ESLint plugins are this package's own dependencies, so a
repo does not list them.

| Entry point                          | What it is                                                       |
| ------------------------------------ | ---------------------------------------------------------------- |
| `@ebalzan/config/prettier`           | the Prettier options                                             |
| `@ebalzan/config/eslint/base`        | JS + typescript-eslint recommended, Prettier-compatible, ignores |
| `@ebalzan/config/eslint/node`        | `base` + Node.js globals                                         |
| `@ebalzan/config/eslint/markdown`    | opt-in: recommended Markdown rules under GFM                     |
| `@ebalzan/config/tsconfig/base.json` | strict compiler options, no target or module                     |
| `@ebalzan/config/tsconfig/node.json` | `base.json` + ES2022 / NodeNext / `@types/node`                  |
| `ebalzan-config verify` (bin)        | checks a repo extends all of the above instead of copying it     |

## Prettier

No overrides: point at it from `package.json` and delete `.prettierrc*`.

```json
{ "prettier": "@ebalzan/config/prettier" }
```

With overrides, `prettier.config.mjs`:

```js
import base from '@ebalzan/config/prettier'

export default { ...base, printWidth: 120 }
```

## ESLint

Flat config is an array: spread a preset, then add the repo's own blocks. A
later block wins for the files it matches.

```js
// eslint.config.js (or .ts)
import markdown from '@ebalzan/config/eslint/markdown'
import node from '@ebalzan/config/eslint/node'

export default [
  ...node,
  ...markdown,
  { ignores: ['generated/'] },
  { files: ['src/**/*.ts'], rules: { 'no-console': 'error' } },
]
```

## TypeScript

```json
{
  "extends": "@ebalzan/config/tsconfig/node.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "paths": { "@/*": ["./src/*"] } },
  "include": ["src/**/*.ts"]
}
```

Keep `outDir`, `rootDir`, `paths`, `include` and `exclude` in the repo:
TypeScript resolves them relative to the file that declares them, so in the
shared file they would point inside `node_modules`.

## Commit messages

Not here: the commit and PR-title rule belongs to the pipeline that enforces it,
[`@ebalzan/ci`](https://github.com/ebalzan/ci) — the PR title becomes the squash
commit that decides the release bump, so the rule lives next to the bump logic.
A repo's `.husky/commit-msg` runs `ebalzan-ci commit-msg "$1"` from that package
(`ebalzan-ci onboard` writes it).

| Package           | Owns                                                                       |
| ----------------- | -------------------------------------------------------------------------- |
| `@ebalzan/config` | how code is written: Prettier, ESLint, TypeScript                          |
| `@ebalzan/ci`     | how code is shipped: commit/PR-title rule, workflows, releases, repo rules |

## Checking that a repo extends everything

```sh
npx --no-install ebalzan-config verify
```

It fails when the package is not a dependency, a static `.prettierrc*` or a
legacy `.eslintrc*` holds its own copy of the rules, `eslint.config.*` imports no
preset, or a `tsconfig*.json` does not reach `@ebalzan/config/tsconfig/*`
through its `extends` chain. A repo with
no `tsconfig*.json` skips the TypeScript check. Run it in each repo's PR checks.

## Releasing

```sh
npm version minor   # or patch / major
git push --follow-tags
```

The tag runs `.github/workflows/publish.yml`. A rule change that can make a
repo's lint fail is a major.
