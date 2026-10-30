import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const flat = (src) => renderDoc(parse(src)).trim().replace(/\n *(?=<)/g, '')
const refused = (rest) => `<dl><dt>T</dt><dd></dd></dl>${rest}`

test('a paragraph between column 0 and the marker refuses the + (carve#4306)', () => {
  assert.equal(flat('  :: T\n  : +\n q\n'), refused('<p>q</p>'))
  assert.equal(flat('   :: T\n   : +\n  q\n'), refused('<p>q</p>'))
  assert.equal(flat('   :: T\n   : +\n q\nmore\n'), refused('<p>q\nmore</p>'))
  assert.equal(flat('> > a\n>\n>   :: T\n>   : +\n>  q\n'),
    '<blockquote><blockquote><p>a</p></blockquote><dl><dt>T</dt><dd></dd></dl><p>q</p></blockquote>')
})

test('the columns that attach still attach', () => {
  assert.equal(flat('  :: T\n  : +\nq\n'), '<dl><dt>T</dt><dd>q</dd></dl>')
  assert.equal(flat('  :: T\n  : +\n  q\n'), '<dl><dt>T</dt><dd>q</dd></dl>')
  assert.equal(flat('  :: T\n  : +\n    q\n'), '<dl><dt>T</dt><dd>q</dd></dl>')
})

test('a block other than a paragraph below the marker still attaches, as for an item', () => {
  for (const [line, html] of [[' > q', '<blockquote><p>q</p></blockquote>'], [' # h', '<h1 id="h">h</h1>']]) {
    assert.equal(flat(`  :: T\n  : +\n${line}\n`), `<dl><dt>T</dt><dd>${html}</dd></dl>`)
    assert.equal(flat(`  * +\n${line}\n`), `<ul><li>${html}</li></ul>`)
  }
})
