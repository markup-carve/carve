import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source + '\n'))

test('a comment after a heading leaves a shifted colon fence an opener', () => {
  const html = render('- a\n  - b\n\n    %%%\n  # h\n    %%\n    :::')
  assert.equal(html, '<ul>\n  <li>a\n    <ul>\n      <li>b</li>\n    </ul>\n    <h1 id="h">h</h1>\n    <div>\n\n    </div>\n  </li>\n</ul>')
})

test('a closer comment spelling keeps the colon opener', () => {
  assert.match(render('- a\n  # h\n      %%\n      :::'), /<h1 id="h">h<\/h1>\s*<div>\s*<\/div>/)
})

test('the nested original keeps the empty div in the outer item', () => {
  const html = render('- a\n  - a\n    - a\n\n      ::: |\n      %%%\n  # heading\n      %%\n      :::')
  assert.match(html, /<h1 id="heading">heading<\/h1>\s*<div>\s*<\/div>\s*<\/li>\s*<\/ul>$/)
})
