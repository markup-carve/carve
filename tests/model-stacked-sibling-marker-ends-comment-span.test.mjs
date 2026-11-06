import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a sibling ending a stacked marker comment span leaves its deepest paragraph open (carve#5281)', () => {
  const cases = [
    ['- - - %%%\n    - m\nc\n', '<ul>\n  <li>\n    <ul>\n      <li>\n        <ul>\n          <li></li>\n          <li>m\nc</li>\n        </ul>\n      </li>\n    </ul>\n  </li>\n</ul>'],
    ['- word\n  * * %%%\n    - m\nc\n', '<ul>\n  <li>word\n    <ul>\n      <li>\n        <ul>\n          <li></li>\n        </ul>\n        <ul>\n          <li>m\nc</li>\n        </ul>\n      </li>\n    </ul>\n  </li>\n</ul>'],
  ]
  for (const [source, expected] of cases) {
    const trace = []
    assert.equal(renderDoc(parse(source, { trace })), expected)
    assert.equal(trace.at(-1).step, 'S4')
  }
})

test('stacked marker sibling variants retain their lazy line (carve#5281)', () => {
  let count = 0
  for (const outer of ['-', '*'])
    for (const middle of ['-', '*'])
      for (const inner of ['-', '*'])
        for (const run of ['%%%', '%%%%'])
          for (const label of ['map', 'word', 'note', 'item', 'text', 'alpha', 'beta', 'gamma'])
            for (const tail of ['c', 'tail', 'next', 'word', 'z', 'after', 'lazy', 'end']) {
              const source = `${outer} ${middle} ${inner} ${run}\n    - ${label}\n${tail}\n`
              const html = renderDoc(parse(source))
              assert.match(html, new RegExp(`<li>${label}\\n${tail}</li>`), source)
              assert.equal(html.endsWith('</ul>'), true, source)
              count++
            }
  assert.equal(count, 1024)
})

test('a sibling code fence still leaves no lazy paragraph (carve#5281)', () => {
  const source = '- - - %%%\n    - ```\nc\n'
  assert.match(renderDoc(parse(source)), /<p>c<\/p>$/)
})
