import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// A comment below a marker-line child's column ends the child, so a paragraph
// after the following blank is the outer item's second paragraph (PART 9 SS17
// L1, carve#3985).
const html = (src) => renderDoc(parse(src))

test('the issue row', () => {
  assert.equal(html('- - p\n  %% c\n\n    F\n'),
    '<ul>\n  <li>\n    <ul>\n      <li>p</li>\n    </ul>\n    <p>F</p>\n  </li>\n</ul>')
})

test('without the comment the paragraph is the child\'s', () => {
  assert.match(html('- - p\n\n    F\n'), /<li><p>p<\/p>\n        <p>F<\/p>/)
})

test('a comment span opened below the child column ends it too', () => {
  assert.match(html('- - p\n  %%%\n  x\n    %%%\n\n    F\n'), /<\/ul>\n    <p>F<\/p>/)
})

test('a comment at the child content column keeps the child', () => {
  assert.doesNotMatch(html('- - p\n    %% c\n\n    F\n'), /<\/ul>\n    <p>F<\/p>/)
})

const hosts = [(l) => l, (l) => (l === '' ? '>' : '> ' + l), (l) => (l === '' ? '' : '  ' + l)]
let count = 0
for (const [h, host] of hosts.entries()) for (const outer of ['- ', '1. ', '* [ ] ']) for (const inner of ['- ', '1. ', '* ']) for (const head of ['p', ':: t']) {
  const childCol = outer.length + inner.length
  for (let col = outer.length; col < childCol; col++) {
    count++
    const lines = [outer + inner + head, ' '.repeat(col) + '%% c', '', ' '.repeat(childCol) + 'F']
    const src = (h === 2 ? '- p\n' : '') + lines.map(host).join('\n') + '\n'
    test(JSON.stringify(src), () => assert.match(html(src), /<p>F<\/p>/))
  }
}
test('the sweep is the size the PR states', () => assert.equal(count, 126))
