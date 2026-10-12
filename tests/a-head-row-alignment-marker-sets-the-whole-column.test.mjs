import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

function check(source, headers, bodyRows) {
  const doc = parse(source)
  const out = renderDoc(doc)
  const cells = [...out.matchAll(/<(th|td)\b([^>]*)>([^<]*)<\/(?:th|td)>/g)]
  const expected = [...headers, ...bodyRows.flat()]
  assert.equal(cells.length, expected.length, out)
  cells.forEach((cell, i) => {
    assert.equal(cell[1], i < headers.length ? 'th' : 'td')
    assert.equal(/text-align: (left|right|center);/.exec(cell[2])?.[1] ?? null, expected[i], out)
  })
  assert.deepEqual(doc.blocks[0].rows[0].cells.map(cell => cell.align), headers)
}

test('a head marker wins over a conflicting delimiter colon', () => {
  check('|=> a |= b |\n|:-- |:-- |\n| 1 | 2 |\n', ['right', 'left'], [['right', 'left']])
})

test('a head marker sets a column whose delimiter has no colon', () => {
  check('|=< a |= b |\n|--- |--: |\n| 1 | 2 |\n', ['left', 'right'], [['left', 'right']])
})

test('a center head marker wins while a body marker overrides only its own cell', () => {
  check('|=~ a |= b |\n|--: |:-- |\n| 1 |> 2 |\n| 3 | 4 |\n',
    ['center', 'left'], [['center', 'right'], ['center', 'left']])
})

test('native head markers still set columns without a delimiter row', () => {
  check('|=> a |=~ b |\n| 1 |< 2 |\n| 3 | 4 |\n',
    ['right', 'center'], [['right', 'left'], ['right', 'center']])
})
