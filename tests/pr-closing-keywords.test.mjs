import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findSharedClosingKeywords } from '../scripts/check-pr-closing-keywords.mjs'

test('rejects a shared closing keyword with each listed separator', () => {
  for (const body of [
    'Closes #123 and #456',
    'Fixes #123, #456',
    'Resolves #123/#456',
    'Closed #123, and #456',
    'Closes: #123 and #456',
    'Closes owner/repo#123 and #456',
    'Closes #123 and owner/repo#456',
    'Fixes #123 #456',
  ]) {
    assert.deepEqual(findSharedClosingKeywords(body), [body])
  }
})

test('accepts a closing keyword for each issue', () => {
  assert.deepEqual(findSharedClosingKeywords('Closes #123, closes #456.'), [])
  assert.deepEqual(findSharedClosingKeywords('Fixes #123 and resolves #456.'), [])
})

test('ignores references without a closing keyword', () => {
  assert.deepEqual(findSharedClosingKeywords('See #123 and #456.'), [])
})

test('ignores closing examples in Markdown code', () => {
  assert.deepEqual(findSharedClosingKeywords('Use `Closes #123 and #456` as a counterexample.'), [])
  assert.deepEqual(findSharedClosingKeywords('```text\nCloses #123 and #456\n```'), [])
  assert.deepEqual(findSharedClosingKeywords('    Closes #123 and #456'), [])
  assert.deepEqual(
    findSharedClosingKeywords('```text\nCloses #123 and #456\n```\nCloses #789 and #900'),
    ['Closes #789 and #900'],
  )
  assert.deepEqual(
    findSharedClosingKeywords('```text\r\nexample\r\n```\r\nCloses #789 and #900'),
    ['Closes #789 and #900'],
  )
})

test('does not join references across lines', () => {
  assert.deepEqual(findSharedClosingKeywords('Closes #123\n\nand #456 is related'), [])
  assert.deepEqual(findSharedClosingKeywords('Closes #123\nand #456'), ['Closes #123\nand #456'])
})

test('does not mask prose between unmatched code spans', () => {
  assert.deepEqual(
    findSharedClosingKeywords('a `b\n\nCloses #123 and #456\n\nc `d` e'),
    ['Closes #123 and #456'],
  )
})

test('does not treat a list continuation as indented code', () => {
  assert.deepEqual(
    findSharedClosingKeywords('- item\n    Closes #123 and #456'),
    ['Closes #123 and #456'],
  )
  assert.deepEqual(
    findSharedClosingKeywords('- item\n\n    Closes #123 and #456'),
    ['Closes #123 and #456'],
  )
  assert.deepEqual(findSharedClosingKeywords('```\nexample\n```\n    Closes #123 and #456'), [])
})
