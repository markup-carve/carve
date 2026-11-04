/*
 * AN EXPLICITLY DELIMITED ROW OF BLANK CELLS IS A TABLE ROW (CARVE-P9-082).
 *
 * T2 counts the cell slots between explicit delimiters and never weighs their
 * content. This replaced the all-blank rejection, so this file guards the
 * predicate in the checker directly: a corpus regen alone would not notice an
 * emptiness test creeping back in. Corpus section 589 pins the rendered HTML.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, isTableRow } from '../scripts/spec/layout.mjs'

const tables = (src) => parse(src).blocks.filter((b) => b.t === 'table')
const onlyRow = (src) => {
  const [table] = tables(src)
  assert.ok(table, `${JSON.stringify(src)} opens no table`)
  assert.equal(table.rows.length, 1, `${JSON.stringify(src)} row count`)
  return table.rows[0]
}
const shape = (cell) => ({ header: cell.header, align: cell.align, attrs: cell.attrs, content: cell.content })
const empty = { header: false, align: null, attrs: null, content: '' }

test('every slot between two delimiters is a cell, whatever it holds', () => {
  for (const [src, n] of [['| |', 1], ['||', 1], ['|||', 2], ['| | |', 2], ['||||', 3]]) {
    const row = onlyRow(`${src}\n`)
    assert.deepEqual(row.cells.map(shape), Array(n).fill(empty), src)
  }
})

test('a lone pipe has no slot and stays prose', () => {
  assert.equal(isTableRow('|'), false)
  assert.deepEqual(tables('|\n'), [])
})

test('an empty marked cell needs the space that ends its run', () => {
  assert.deepEqual(shape(onlyRow('|= |\n').cells[0]), { ...empty, header: true })
  assert.deepEqual(shape(onlyRow('|=|\n').cells[0]), { ...empty, content: '=' })
  assert.deepEqual(shape(onlyRow('|{>} |\n').cells[0]), { ...empty, align: 'right' })
  assert.deepEqual(shape(onlyRow('|>|\n').cells[0]), { ...empty, content: '>' })
  assert.deepEqual(shape(onlyRow('|={~ .x} |\n').cells[0]), { header: true, align: 'center', attrs: '{.x}', content: '' })
  assert.deepEqual(shape(onlyRow('|{#x} |\n').cells[0]), { ...empty, attrs: '{#x}' })
  assert.deepEqual(shape(onlyRow('|{#x}|\n').cells[0]), { ...empty, content: '{#x}' })
})

test('a glued row attribute block stays on the row', () => {
  const row = onlyRow('| |{.row}\n')
  assert.equal(row.rowAttrs, '{.row}')
  assert.deepEqual(row.cells.map(shape), [empty])
})

test('a tab between the pipes is content, not padding', () => {
  assert.equal(onlyRow('|\t|\n').cells[0].content, '\t')
})

test('opening and paragraph interruption answer the same way', () => {
  for (const line of ['| |', '||', '|||']) {
    assert.equal(isTableRow(line), true, line)
    const blocks = parse(`text\n${line}\n`).blocks.map((b) => b.t)
    assert.deepEqual(blocks, ['para', 'table'], line)
  }
})

test('blank rows neither disappear nor merge, and a continuation adds none', () => {
  assert.equal(tables('| |\n| a |\n| |\n')[0].rows.length, 3)
  assert.equal(tables('| | |\n|||\n')[0].rows.length, 2)
  assert.equal(tables('| |\n+ |\n| |\n')[0].rows.length, 2)
  assert.deepEqual(tables('+ | |\n'), [], 'a table still cannot begin with a continuation')
})
