import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')

test('a description holding a list ends at its item marker column (carve#5321)', () => {
  assert.equal(html('- a\n  :: t\n  : u\n    - x\n: b\n'),
    '<ul><li>a<dl><dt>t</dt><dd><p>u</p><ul><li>x</li></ul></dd></dl></li></ul><p>: b</p>')
  assert.match(html('1. a\n   :: t\n   : u\n     - x\n   : b\n: c\n'), /<dd>b<\/dd><\/dl><\/li><\/ol><p>: c<\/p>$/)
  assert.match(html('- a\n  - b\n    :: t\n    : u\n      - x\n: b\n'), /<li>x<\/li><\/ul><\/dd><\/dl><\/li><\/ul><\/li><\/ul><p>: b<\/p>$/)
  assert.match(html('- a\n  - b\n    :: t\n    : u\n      - x\n   : b\n: c\n'), /<li>x: b<\/li>[\s\S]*<p>: c<\/p>$/)
  assert.match(html('- x\n  :: t\n  : desc\n  - b\n: z\n'), /<li>b: z<\/li>/)
})

test('a quoted note span on a marker line takes no lazy line (carve#5322)', () => {
  for (const marker of ['. ', '- ', '1. ', '* ']) {
    assert.match(html(`> [^n]: i\n>   ${marker}%%%\nzz\n\n[^n]\n`), /^<blockquote><\/blockquote><p>zz<\/p>/)
    assert.match(html(`> > [^n]: i\n> >   ${marker}%%%\nzz\n\n[^n]\n`), /^<blockquote><blockquote><\/blockquote><\/blockquote><p>zz<\/p>/)
  }
  assert.match(html('> > - i\n> >   . %%%\nzz\n'), /<\/blockquote><\/blockquote><p>zz<\/p>$/)
})

test('a comment span before a + attached fence keeps the fence whole (carve#5324)', () => {
  assert.equal(renderDoc(parse('- +\n%%%\nq\n%%%\n```\n\n```\n')), '<ul>\n  <li>\n    <pre><code>\n</code></pre>\n  </li>\n</ul>')
  assert.match(html('- +\n%%%\nq\n%%%\n```\n\n```\nafter\n'), /<\/ul><p>after<\/p>$/)
})

test('a note before a stacked + fence leaves the blank to the outer item (carve#5325)', () => {
  const plain = html('- - +\n  ```\n\n  z\nafter\n')
  assert.equal(html('- - +\n  [^n]: x\n  ```\n\n  z\nafter\n'), plain)
  assert.match(plain, /<p>zafter<\/p><\/li><\/ul>$/)
})

test('a blank that ends a deep + fence separates the outer item blocks (carve#5326)', () => {
  assert.match(html('1. a\n   - b\n     - +\n     ```\n\n    ```\n'), /^<ol><li><p>a<\/p>/)
  assert.match(html('1. a\n   - b\n     - +\n     ```\n\n   1. s\n'), /^<ol><li><p>a<\/p>/)
  assert.match(html('1. a\n   - b\n     - +\n     ```\n\n     - s\n'), /^<ol><li>a<ul><li>b<ul>/)
  assert.match(html('- a\n  - +\n  ```\n  x\n  ```\n\n  - s\n'), /^<ul><li>a<ul>/)
})
