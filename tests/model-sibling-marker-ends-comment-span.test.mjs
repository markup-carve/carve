import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a sibling marker ending a marker-line comment span leaves its paragraph open (carve#5275)', () => {
  assert.equal(renderDoc(parse('- - %%%\n  - m\nc\n')),
    '<ul>\n  <li>\n    <ul>\n      <li></li>\n      <li>m\nc</li>\n    </ul>\n  </li>\n</ul>')
  const source = '- a\n  - %%%\n  - m\nc\n'
  const trace = []
  assert.equal(renderDoc(parse(source, { trace })), '<ul>\n  <li>a\n    <ul>\n      <li></li>\n      <li>m\nc</li>\n    </ul>\n  </li>\n</ul>')
  assert.deepEqual(trace.find((row) => row.line === 4), {
    line: 4, step: 'S4', owner: 'doc/item:1/item:3', rule: 'CARVE-P0-006', form: 'lazy', reached: 'doc',
  })
  assert.equal(renderDoc(parse('i) word\n   1. %%%%\n   - m\na_b\n')),
    '<ol type="i" data-delim=")">\n  <li>word\n    <ol>\n      <li></li>\n    </ol>\n    <ul>\n      <li>m\na_b</li>\n    </ul>\n  </li>\n</ol>')
})

test('1,000 sibling-marker span variants retain the lazy line (carve#5275)', () => {
  let count = 0
  for (const parentMarker of ['-', '*'])
    for (const childMarker of ['-', '*'])
      for (const run of ['%%%', '%%%%'])
        for (const indent of [2, 3, 4, 5, 6])
          for (const parent of ['alpha', 'beta', 'gamma', 'delta', 'epsilon'])
            for (const child of ['map', 'note', 'word', 'item', 'text']) {
              const source = `${parentMarker} ${parent}\n${' '.repeat(indent)}${childMarker} ${run}\n${' '.repeat(indent)}${childMarker} ${child}\ntail\n`
              const expected = `<ul>\n  <li>${parent}\n    <ul>\n      <li></li>\n      <li>${child}\ntail</li>\n    </ul>\n  </li>\n</ul>`
              assert.equal(renderDoc(parse(source)), expected, source)
              count++
            }
  assert.equal(count, 1000)
})
