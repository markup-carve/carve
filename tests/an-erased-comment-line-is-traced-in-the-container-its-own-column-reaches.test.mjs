/*
 * The model traces an erased `%%` line in the container its own column
 * reaches; a later line that keeps a deeper container open does not move it
 * (CARVE-P0-005, carve#5178, carve#6003).
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

const owner = (source, line) => modelTrace(source).find((record) => record.line === line && record.form === 'comment')?.owner
const corpus = (name) => readFileSync(new URL(`./corpus/${name}.crv`, import.meta.url), 'utf8')

test('corpus 951: a comment at the item column is the item\'s, not the note\'s', () => {
  const source = corpus('951-an-unclosed-fence-in-a-marker-line-note-cannot-retain-the-following-line')
  assert.equal(source, '- [^n]: t\n  %%\n\n    ~~~\n    e\n]\n')
  assert.equal(owner(source, 2), 'doc/item:1')
})

test('a comment at the outer item column is the outer item\'s whatever follows', () => {
  for (const after of ['', '\n    b\n', '\n  b\n', 'b\n', '    b\n']) {
    assert.equal(owner(`- - a\n\n  %% n\n${after}`, 3), 'doc/item:1', JSON.stringify(after))
  }
})

test('a comment at the note body column stays in the note', () => {
  assert.equal(owner('- [^n]: t\n\n        %% n\n\n  x\n', 3), 'doc/item:1/footnote:1')
})

test('a comment at column zero is the document\'s even before a deeper line', () => {
  assert.equal(owner('- a\n\n%% n\n\n  b\n', 3), 'doc')
})
