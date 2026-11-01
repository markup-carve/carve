import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('an ended note frame leaves later item paragraphs visible to list tightness', () => {
  const source = '- [r]: /u\n  [^f]: a\n\n  x\n\n    y\n'
  assert.equal(html(source), '<ul>\n  <li><p>x</p>\n    <p>y</p>\n  </li>\n</ul>')
})

test('a note still claims its own lazy line before its paragraph ends', () => {
  const source = 'r[^f]\n\n- [r]: /u\n  [^f]: a\n  Body.\n\n  Two.\n'
  assert.match(html(source), /<li>(?:<p>)?Two\.(?:<\/p>)?<\/li>/)
  assert.match(html(source), /<p>a\nBody\./)
})
