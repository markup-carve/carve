import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).replace(/<section[\s\S]*$/, '').trim()

test('a comment span at the item column under a marker-line note leaves no paragraph for a lazy line (carve#5878)', () => {
  const left = '<blockquote>\n  <ul>\n    <li></li>\n  </ul>\n</blockquote>\n<p>plain</p>'
  assert.equal(html('> - [^n]: {% a\n>   %%%\n>   z %}\nplain\n\nx[^n]\n').split('\n<p>x')[0], left)
  assert.equal(html('> - [^n]: a\n>   %%%\n>   z\nplain\n\nx[^n]\n').split('\n<p>x')[0], left)
  assert.equal(html('> - [ ] [^n]: a\n>   %%%\n>   z\nplain\n\nx[^n]\n').split('\n<p>x')[0],
    '<blockquote>\n  <ul class="task-list">\n    <li><input type="checkbox" disabled> </li>\n  </ul>\n</blockquote>\n<p>plain</p>')
  assert.match(html('> :: t\n> : [^n]: a\n>   %%%\n>   z\nplain\n\nx[^n]\n'), /<\/blockquote>\n<p>plain<\/p>/)
})

test('a nested quote ends a comment span at a text line left of its fence, as the outer level does', () => {
  assert.match(html('> - [^n]: a\n>   %%%\n> z\nplain\n\nx[^n]\n'), /<p>z\nplain<\/p>/)
  assert.match(html('> > - [^n]: a\n> >   %%%\n> > z\nplain\n\nx[^n]\n'), /<p>z\nplain<\/p>/)
  assert.match(html('> > - a\n> >   %%%\n> > z\nplain\n'), /<p>z\nplain<\/p>/)
  // A line at the span's column stays payload.
  assert.match(html('> > - a\n> >   %%%\n> >   z\nplain\n'), /<\/blockquote>\n<p>plain<\/p>/)
})
