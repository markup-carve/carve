import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('an empty nested item ends before a line below the outer item column', () => {
  assert.equal(render('- > a\n  - +\nH\n'),
    '<ul>\n  <li>\n    <blockquote><p>a</p></blockquote>\n    <ul>\n      <li></li>\n    </ul>\n  </li>\n</ul>\n<p>H</p>')
})

test('an attached paragraph in the nested item still takes a lazy follower', () => {
  assert.match(render('- > a\n  - +\n  p\nH\n'), /<li>p\nH<\/li>/)
})
