import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const flat = (src) => html(src).replace(/\n *(?=<)/g, '')

test('a line without the quote prefixes refuses a description first-block + and folds as text (carve#4409)', () => {
  assert.equal(flat('> :: t\n> : +\npara\n'), '<blockquote><dl><dt>t</dt><dd>+\npara</dd></dl></blockquote>')
  assert.equal(flat('> :: t\n> :   +\npara\n'), '<blockquote><dl><dt>t</dt><dd>+\npara</dd></dl></blockquote>')
  assert.equal(flat('> :: t\n> : +\n- y\n'), '<blockquote><dl><dt>t</dt><dd>+\n- y</dd></dl></blockquote>')
  assert.equal(flat('> > :: t\n> > : +\npara\n'), '<blockquote><blockquote><dl><dt>t</dt><dd>+\npara</dd></dl></blockquote></blockquote>')
  assert.equal(flat('> > :: t\n> > : +\n> q\n'), '<blockquote><blockquote><dl><dt>t</dt><dd>+\nq</dd></dl></blockquote></blockquote>')
})

test('the item twin reads the same way', () => {
  assert.equal(flat('> - +\npara\n'), '<blockquote><ul><li>+\npara</li></ul></blockquote>')
  assert.equal(flat('> > - +\npara\n'), '<blockquote><blockquote><ul><li>+\npara</li></ul></blockquote></blockquote>')
})

test('a quoted line still attaches to the description (CARVE-P9-067)', () => {
  assert.equal(flat('> :: t\n> : +\n> para\n'), '<blockquote><dl><dt>t</dt><dd>para</dd></dl></blockquote>')
})

test('a note on a quoted description marker line folds its follower behind a refused + (carve#4409)', () => {
  const out = html('> :: t\n> : [^b]: +\n- y\n\nr[^b]\n')
  assert.match(out.replace(/\n */g, ''), /^<blockquote><dl><dt>t<\/dt><dd><\/dd><\/dl><\/blockquote><p>r/)
  assert.deepEqual(parse('> :: t\n> : [^b]: +\n- y\n\nr[^b]\n').footnoteDefs.get('b'), [{ t: 'para', lines: ['+', '- y'] }])
})

test('the block a description first-block + takes continues lazily, as an item does', () => {
  assert.equal(flat(':: t\n: +\nq\nmore\n'), '<dl><dt>t</dt><dd>q\nmore</dd></dl>')
  assert.equal(flat('- +\nq\nmore\n'), '<ul><li>q\nmore</li></ul>')
  assert.equal(flat(':: t\n: +\n  q\nmore\n'), '<dl><dt>t</dt><dd>+\nq\nmore</dd></dl>')
  assert.equal(flat('- +\n  q\nmore\n'), '<ul><li>+\nq\nmore</li></ul>')
  assert.equal(flat(':: t\n: +\nq\n- y\n'), flat(':: t\n: q\n- y\n'))
  assert.equal(flat('>  :: t\n>  : +\n>  q\nmore\n'), '<blockquote><dl><dt>t</dt><dd>q\nmore</dd></dl></blockquote>')
  assert.equal(flat('>  :: t\n>  : +\n> q\nmore\n'), '<blockquote><dl><dt>t</dt><dd>+\nq\nmore</dd></dl></blockquote>')
})
