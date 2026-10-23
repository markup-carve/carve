import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

test('a refused plus remains in the inner quote after an outer inline code span', () => {
  assert.equal(html('> quote\n  ```\n> > +\n  ```\nnext'),
    '<blockquote><p>quote<code></code></p><blockquote><p>+<code>\nnext</code></p></blockquote></blockquote>')
})

for (const letter of ['+', 'z']) {
  test(`the follower at an intervening column does not attach: ${letter}`, () => {
    assert.match(html(`> > ${letter}\n  y`), new RegExp(`<blockquote><blockquote><p>\\${letter === '+' ? '+' : letter}\\ny<\\/p>`))
  })
}

test('a refused plus after a description fence remains quote text', () => {
  assert.match(html(':: term\n: body\n  ```\n> > +\n  ```\nnext'),
    /<\/dl><blockquote><blockquote><p>\+<code>\nnext<\/code><\/p><\/blockquote><\/blockquote>$/)
})

test('a document-column follower attaches to the stacked quote', () => {
  assert.match(html('> > +\ny'), /<blockquote><blockquote><p>y<\/p><\/blockquote><\/blockquote>$/)
})

test('a follower at the item opener column attaches to the innermost item', () => {
  assert.match(html('- a\n  - - +\n  y'), /<li>y<\/li>/)
})

test('a first-block quote at document column takes its flush follower', () => {
  assert.match(html('> +\nflush'), /<blockquote><p>flush<\/p><\/blockquote>$/)
})

test('a quoted plus and its list follower read the same inside and outside an item', () => {
  const nested = renderDoc(parse('- > - > a\n  >   +\n  >   - s\n'))
  const top = renderDoc(parse('> - > a\n>   +\n>   - s\n'))
  for (const html of [nested, top]) {
    assert.match(html, /<blockquote><p>a\n\+\n- s<\/p><\/blockquote>/)
    assert.doesNotMatch(html, /<li>s<\/li>/)
  }
})
