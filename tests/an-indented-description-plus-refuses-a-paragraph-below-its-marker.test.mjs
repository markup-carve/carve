import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const flat = (src) => renderDoc(parse(src)).trim().replace(/\n *(?=<)/g, '')
const refused = (body) => `<dl><dt>T</dt><dd>${body}</dd></dl>`

test('a paragraph off the marker column refuses the + and folds into it (carve#4306)', () => {
  assert.equal(flat('  :: T\n  : +\n q\n'), refused('+\nq'))
  assert.equal(flat('   :: T\n   : +\n  q\n'), refused('+\nq'))
  assert.equal(flat('   :: T\n   : +\n q\nmore\n'), refused('+\nq\nmore'))
  assert.equal(flat('  :: T\n  : +\nq\n'), refused('+\nq'))
  assert.equal(flat('  :: T\n  : +\n    q\n'), refused('+\nq'))
  assert.equal(flat('> > a\n>\n>   :: T\n>   : +\n>  q\n'),
    '<blockquote><blockquote><p>a</p></blockquote><dl><dt>T</dt><dd>+\nq</dd></dl></blockquote>')
})

test('the marker column attaches', () => {
  assert.equal(flat('  :: T\n  : +\n  q\n'), '<dl><dt>T</dt><dd>q</dd></dl>')
  assert.equal(flat('> > a\n>\n>   :: T\n>   : +\n>   q\n'),
    '<blockquote><blockquote><p>a</p></blockquote><dl><dt>T</dt><dd>q</dd></dl></blockquote>')
})

test('any other block reads the same columns, as for an item', () => {
  for (const [line, html, after] of [['> q', '<blockquote><p>q</p></blockquote>', '<blockquote><p>q</p></blockquote>'], ['# h', '<h1 id="h">h</h1>', '<section id="h"><h1>h</h1></section>']]) {
    assert.equal(flat(`  :: T\n  : +\n  ${line}\n`), `<dl><dt>T</dt><dd>${html}</dd></dl>`)
    assert.equal(flat(`  * +\n  ${line}\n`), `<ul><li>${html}</li></ul>`)
    assert.equal(flat(`  :: T\n  : +\n ${line}\n`), `<dl><dt>T</dt><dd>+</dd></dl>${after}`)
    assert.equal(flat(`  * +\n ${line}\n`), `<ul><li>+</li></ul>${after}`)
  }
})
