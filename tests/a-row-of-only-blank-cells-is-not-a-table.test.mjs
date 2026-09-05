/*
 * A STANDARD ROW WHOSE EVERY CELL IS BLANK IS NOT A TABLE -- carve#1950.
 *
 * The single empty PLAIN cell was already rejected (`||` is a paragraph); the
 * guard reached neither a multi-cell all-empty row nor the header path. A table
 * whose every cell is empty carries no data, so it degrades to text like the
 * one- and two-pipe cases already do.
 *
 * The boundary is content a reader wrote: a cell carrying an alignment, valign
 * or attribute run was authored deliberately and holds its row a table. The
 * header marker is the one exception the ruling names, since `|= |` is an empty
 * header cell.
 *
 * The corpus pins the whole matrix (section 453). This unit test guards the
 * PREDICATE so a change that reverts it to the single-cell form fails here even
 * if a corpus regen were skipped.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const isTable = (src) => /<table/.test(renderDoc(parse(src)))

test('a multi-cell all-empty row is not a table', () => {
  assert.equal(isTable('|||\n'), false)
  assert.equal(isTable('||||\n'), false)
  assert.equal(isTable('| | |\n'), false, 'whitespace-only cells are empty')
})

test('an empty header cell is not a table', () => {
  assert.equal(isTable('|= |\n'), false)
})

test('the single plain empty cell stays rejected', () => {
  assert.equal(isTable('||\n'), false)
})

test('a row with any content is still a table', () => {
  assert.equal(isTable('|a|b|\n'), true)
  assert.equal(isTable('| a | |\n'), true, 'one filled cell is enough')
  assert.equal(isTable('|=|\n'), true, 'a cell whose content is a literal = is not empty')
})

test('a deliberately marked cell holds its row a table', () => {
  assert.equal(isTable('|{.x} |\n'), true, 'an attribute run is content the author wrote')
  assert.equal(isTable('|> |\n'), true, 'an alignment run is too')
})
