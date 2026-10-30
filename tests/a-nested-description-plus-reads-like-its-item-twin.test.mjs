import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const flat = (src) => renderDoc(parse(src)).trim().replace(/\n *(?=<)/g, '')
// The description's rendered element, respelled as the item's (CARVE-P9-067).
const asItem = (html) => html.replace(/<dl><dt>T<\/dt><dd>([\s\S]*?)<\/dd><\/dl>/, '<ul><li>$1</li></ul>')

test('a nested description first-block + spent on a sublist leaves a column-0 heading outside', () => {
  assert.equal(flat('- a\n  :: T\n  : +\n  - y\n# h2\n'),
    '<ul><li>a<dl><dt>T</dt><dd><ul><li>y</li></ul></dd></dl></li></ul><section id="h2"><h1>h2</h1></section>')
  assert.equal(flat(':: s\n: a\n\n  :: T\n  : +\n  - y\n# h2\n'),
    '<dl><dt>s</dt><dd><p>a</p><dl><dt>T</dt><dd><ul><li>y</li></ul></dd></dl></dd></dl><section id="h2"><h1>h2</h1></section>')
})

test('a list refuses the + off its marker column, and always under an item', () => {
  assert.equal(flat('- a\n  :: T\n  : +\n    - y\n# h2\n'),
    '<ul><li>a<dl><dt>T</dt><dd>+\n- y</dd></dl></li></ul><section id="h2"><h1>h2</h1></section>')
  assert.equal(flat('- a\n  * +\n  - y\n'), '<ul><li>a<ul><li>+</li></ul><ul><li>y</li></ul></li></ul>')
})

test('a closed block in a nested description leaves no paragraph for a column-0 line (CARVE-P0-011)', () => {
  assert.equal(flat('- a\n\n  :: T\n  : # h\nafter\n'),
    '<ul><li>a<dl><dt>T</dt><dd><h1 id="h">h</h1></dd></dl></li></ul><p>after</p>')
  assert.equal(flat(':: s\n: a\n\n  :: T\n  : # h\nafter\n'),
    '<dl><dt>s</dt><dd><p>a</p><dl><dt>T</dt><dd><h1 id="h">h</h1></dd></dl></dd></dl><p>after</p>')
  assert.equal(flat(':: s\n: a\n\n  :: T\n  : +\n  # h\nafter\n'),
    '<dl><dt>s</dt><dd><p>a</p><dl><dt>T</dt><dd><h1 id="h">h</h1></dd></dl></dd></dl><p>after</p>')
  assert.equal(flat(':: s\n: a\n\n  :: T\n  : +\n    # h\nafter\n'),
    '<dl><dt>s</dt><dd><p>a</p><dl><dt>T</dt><dd><p>+</p><h1 id="h">h</h1></dd></dl></dd></dl><p>after</p>')
  assert.equal(flat(':: s\n: :: T\n  : # h\nafter\n'),
    '<dl><dt>s</dt><dd><dl><dt>T</dt><dd><h1 id="h">h</h1></dd></dl></dd></dl><p>after</p>')
})

test('a paragraph between the enclosing item columns refuses a nested description + and folds into it (corpus 633-6)', () => {
  assert.equal(flat('- a\n\n  :: T\n  : +\n q\n'), '<ul><li>a<dl><dt>T</dt><dd>+\nq</dd></dl></li></ul>')
  assert.equal(flat('- a\n\n  * +\n q\n'), '<ul><li>a<ul><li>+\nq</li></ul></li></ul>')
})

test('an open paragraph in a nested description still takes a lazy line', () => {
  assert.equal(flat('- a\n  :: T\n  : x\nafter\n'), '<ul><li>a<dl><dt>T</dt><dd>x\nafter</dd></dl></li></ul>')
  assert.equal(flat(':: s\n: a\n\n  :: T\n  : x\nafter\n'), '<dl><dt>s</dt><dd><p>a</p><dl><dt>T</dt><dd>x\nafter</dd></dl></dd></dl>')
})

test('a column-0 heading refuses a nested description +, its marker column attaches', () => {
  assert.equal(flat('- a\n  :: T\n  : +\n# h\n'), '<ul><li>a<dl><dt>T</dt><dd>+</dd></dl></li></ul><section id="h"><h1>h</h1></section>')
  assert.equal(flat('- a\n  :: T\n  : +\n  # h\n'), '<ul><li>a<dl><dt>T</dt><dd><h1 id="h">h</h1></dd></dl></li></ul>')
})

// Under a description a column-0 marker folds into an open paragraph, so `- z` is left out there.
// An item refuses a list at its marker column and a description takes it, so no list follower here.
for (const [wrapper, prefix, trailers] of [['item', '- a\n', ['after', '# h2', '- z']], ['description', ':: s\n: a\n\n', ['after', '# h2']]]) {
  for (const follower of ['  # h', '  ***', '  | a |', '  > q']) {
    for (const trailer of trailers) {
      test(`${wrapper}: ": +" over "${follower}" then "${trailer}" reads as "* +" does`, () => {
        const description = flat(`${prefix}  :: T\n  : +\n${follower}\n${trailer}\n`)
        const item = flat(`${prefix}  * +\n${follower}\n${trailer}\n`)
        assert.equal(asItem(description), item)
      })
    }
  }
}
