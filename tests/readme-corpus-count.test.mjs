/*
 * Corpus inventory belongs in generated or maintainer-facing reports. Exact or
 * approximate totals on the repository landing page drift as tests are added
 * and make an implementation detail compete with reader-facing guidance.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const readme = readFileSync(resolve(root, 'README.md'), 'utf8')

test('the README keeps volatile corpus counts out of reader-facing prose', () => {
  assert.doesNotMatch(
    readme,
    /\b(?:more than|over|about|approximately)?\s*[1-9][\d,]+\+?\s+(?:[\w/-]+\s+){0,4}(?:tests|examples)\b/i,
    'README describes shared coverage without advertising an inventory count',
  )
})
