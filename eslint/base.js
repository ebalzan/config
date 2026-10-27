import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import tseslint from 'typescript-eslint'

export const CODE_FILES = ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}']

// What every repo lints the same way: the recommended JS and TypeScript rules,
// on code files only, so a preset that lints another language (markdown.js)
// does not get JS rules run over it.
export default [
  {
    name: 'ebalzan/ignores',
    ignores: [
      'dist/',
      'build/',
      'coverage/',
      // Agent tooling. Not just noise to skip: some files there are not
      // world-readable, and walking into them fails the whole run with EACCES
      // rather than a lint error.
      '.agents/',
      '.claude/',
      '.cursor/',
    ],
  },
  { ...js.configs.recommended, name: 'ebalzan/js', files: CODE_FILES },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: config.files ?? CODE_FILES,
  })),
  // Last, so no rule above fights Prettier over formatting.
  prettier,
]
