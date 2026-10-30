import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a footnote definition as a description body keeps the next description (carve#4043)', () => {
  const doc = parse(':: m\n: [^c]: a\n: b\n')
  assert.equal(html(':: m\n: [^c]: a\n: b\n'), '<dl>\n  <dt>m</dt>\n  <dd></dd>\n  <dd>b</dd>\n</dl>')
  assert.deepEqual(doc.footnoteDefs.get('c'), [{ t: 'para', lines: ['a'] }])
})

for (const [host, src] of [
  ['a list item', '- :: m\n  : [^c]: a\n  : b\n'],
  ['a block quote', '> :: m\n> : [^c]: a\n> : b\n'],
  ['a description', ':: o\n: :: m\n  : [^c]: a\n  : b\n'],
]) {
  test(`in ${host} the sibling description is kept`, () => {
    assert.match(html(src), /<dd><\/dd>\n\s*<dd>b<\/dd>/)
    assert.deepEqual(parse(src).footnoteDefs.get('c'), [{ t: 'para', lines: ['a'] }])
  })
}

test('a description marker past the owner column opens the sibling too (carve#4180)', () => {
  const doc = parse(':: m\n: [^c]: a\n : b\n')
  assert.equal(html(':: m\n: [^c]: a\n : b\n'), '<dl>\n  <dt>m</dt>\n  <dd></dd>\n  <dd>b</dd>\n</dl>')
  assert.deepEqual(doc.footnoteDefs.get('c'), [{ t: 'para', lines: ['a'] }])
})
