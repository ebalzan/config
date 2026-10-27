import markdown from '@eslint/markdown'

// Opt-in: the recommended Markdown rules, under GFM rather than CommonMark.
// The docs use task lists and tables, and under CommonMark a `- [x]` item
// parses as a link reference, so every checklist entry reports a phantom
// "Label reference not found".
export default markdown.configs.recommended.map(config => ({
  ...config,
  name: 'ebalzan/markdown',
  language: 'markdown/gfm',
}))
