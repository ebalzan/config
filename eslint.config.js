// This repo uses its own presets, imported by package name like any consumer.
import markdown from '@ebalzan/config/eslint/markdown'
import node from '@ebalzan/config/eslint/node'

export default [...node, ...markdown]
