import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const flat = (src) => html(src).replace(/\n *(?=<)/g, '')

test('an unprefixed line refuses a quoted description first-block + and closes the quote (carve#4230)', () => {
  assert.equal(flat('> :: t\n> : +\npara\n'), '<blockquote><dl><dt>t</dt><dd></dd></dl></blockquote><p>para</p>')
  assert.equal(flat('> :: t\n> :   +\npara\n'), '<blockquote><dl><dt>t</dt><dd></dd></dl></blockquote><p>para</p>')
  assert.equal(flat('> :: t\n> : +\n- y\n'), '<blockquote><dl><dt>t</dt><dd></dd></dl></blockquote><ul><li>y</li></ul>')
  assert.equal(flat('> > :: t\n> > : +\npara\n'), '<blockquote><blockquote><dl><dt>t</dt><dd></dd></dl></blockquote></blockquote><p>para</p>')
  assert.equal(flat('> > :: t\n> > : +\n> q\n'), '<blockquote><blockquote><dl><dt>t</dt><dd></dd></dl></blockquote><p>q</p></blockquote>')
})

test('the item twin reads the same way', () => {
  assert.equal(flat('> - +\npara\n'), '<blockquote><ul><li></li></ul></blockquote><p>para</p>')
  assert.equal(flat('> > - +\npara\n'), '<blockquote><blockquote><ul><li></li></ul></blockquote></blockquote><p>para</p>')
})

test('a quoted line still attaches to the description (CARVE-P9-067)', () => {
  assert.equal(flat('> :: t\n> : +\n> para\n'), '<blockquote><dl><dt>t</dt><dd>para</dd></dl></blockquote>')
})

test('a note on a quoted description marker line keeps its refused + as a letter (carve#4396)', () => {
  const source = (letter) => `> :: t\n> : [^b]: ${letter}\n- y\n\nr[^b]\n`
  assert.equal(html(source('+')), html(source('Q')).replaceAll('Q', '+'))
  assert.deepEqual(parse(source('+')).footnoteDefs.get('b'), [{ t: 'para', lines: ['+', '- y'] }])
})

test('the block a description first-block + takes continues lazily, as an item does', () => {
  for (const follower of ['q', '  q']) {
    assert.equal(flat(`:: t\n: +\n${follower}\nmore\n`), '<dl><dt>t</dt><dd>q\nmore</dd></dl>')
    assert.equal(flat(`- +\n${follower}\nmore\n`), '<ul><li>q\nmore</li></ul>')
  }
  assert.equal(flat(':: t\n: +\n  q\n- y\n'), flat(':: t\n: q\n- y\n'))
  assert.equal(flat('>  :: t\n>  : +\n> q\nmore\n'), '<blockquote><dl><dt>t</dt><dd>q\nmore</dd></dl></blockquote>')
})
