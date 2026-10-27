// The one Prettier config. A repo with no overrides points at it from
// package.json ("prettier": "@ebalzan/config/prettier"); one with overrides
// spreads it in prettier.config.mjs.
/** @type {import('prettier').Config} */
export default {
  printWidth: 100,
  tabWidth: 2,
  singleQuote: true,
  bracketSameLine: true,
  trailingComma: 'all',
  semi: false,
  bracketSpacing: true,
  arrowParens: 'avoid',
}
