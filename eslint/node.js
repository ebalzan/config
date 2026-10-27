import globals from 'globals'
import base, { CODE_FILES } from './base.js'

export { CODE_FILES }

// base + the Node.js globals, for services and scripts.
/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  { name: 'ebalzan/node', files: CODE_FILES, languageOptions: { globals: globals.node } },
]
