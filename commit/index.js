// The one Conventional Commits rule: the husky commit-msg hook (locally) and
// the PR-title check (in CI) both apply it. Anything else that maps types to
// something (release bumps, labels) should import COMMIT_TYPES from
// @ebalzan/config/commit rather than keep its own list.
export const COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refact',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
]

export const SUBJECT_PATTERN = new RegExp(`^(${COMMIT_TYPES.join('|')})(\\([^)]+\\))?(!)?: .+`)

// Subjects git writes itself. They never reach main as-is: a squash merge keeps
// the PR title, which is checked.
const EXEMPT_PREFIXES = ['Merge ', 'Revert ', 'fixup! ', 'squash! ']

export function isExemptSubject(subject) {
  return EXEMPT_PREFIXES.some(prefix => subject.startsWith(prefix))
}

export function isConventionalSubject(subject) {
  return SUBJECT_PATTERN.test(subject)
}

// Returns null when the subject is valid, else the message to print.
export function checkSubject(subject, label = 'commit message') {
  if (isConventionalSubject(subject)) return null
  const head = subject ? `Invalid ${label}: "${subject}"` : `Invalid ${label}: value is empty.`
  return [
    head,
    'Use Conventional Commits, for example:',
    '  feat(viewer): add section filters',
    '  fix: prevent null model crash',
  ].join('\n')
}
