import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()

test('a closed fence below the quote column ends the quote and holds the stacked plus as code', () => {
  assert.equal(html('> quote\n  ```\n> > +\n  ```\nnext'),
    '<blockquote><p>quote</p></blockquote><pre><code>&gt; &gt; +</code></pre><p>next</p>')
})

test('a letter keeps a follower at the owning quote column as text', () => {
  assert.match(html('> > z\n  y'), /<blockquote><blockquote><p>z\ny<\/p>/)
})

test('a follower at the owning quote column attaches only under the outer prefix', () => {
  assert.match(html('> > +\n> y'), /<blockquote><blockquote><p>y<\/p><\/blockquote><\/blockquote>$/)
  assert.match(html('> > +\n  y'), /<blockquote><blockquote><p>\+\ny<\/p><\/blockquote><\/blockquote>$/)
})

test('a fence after a description fence attaches at the owning quote column', () => {
  assert.match(html(':: term\n: body\n  ```\n> > +\n> ```\n> next'),
    /<\/dl><blockquote><blockquote><pre><code>next<\/code><\/pre><\/blockquote><\/blockquote>$/)
  assert.match(html(':: term\n: body\n  ```\n> > +\n  ```\nnext'),
    /<\/dl><blockquote><blockquote><p>\+<\/p><\/blockquote><\/blockquote><pre><code>next<\/code><\/pre>$/)
})

test('a document-column follower is refused by the stacked quote', () => {
  assert.match(html('> > +\ny'), /<blockquote><blockquote><p>\+\ny<\/p><\/blockquote><\/blockquote>$/)
})

test('a follower at the innermost marker column attaches, one at the opener column does not', () => {
  assert.match(html('- a\n  - - +\n    y'), /<li>y<\/li>/)
  assert.match(html('- a\n  - - +\n  y'), /<li>\+\ny<\/li>/)
})

test('a first-block quote at document column takes its flush follower', () => {
  assert.match(html('> +\nflush'), /<blockquote><p>flush<\/p><\/blockquote>$/)
})

test('a quoted plus and its list follower read the same inside and outside an item', () => {
  const nested = renderDoc(parse('- > - > a\n  >   +\n  >   - s\n'))
  const top = renderDoc(parse('> - > a\n>   +\n>   - s\n'))
  for (const html of [nested, top]) {
    assert.match(html, /<blockquote>\s*<p>a<\/p>\s*<ul>\s*<li>s<\/li>\s*<\/ul>\s*<\/blockquote>/)
  }
})
