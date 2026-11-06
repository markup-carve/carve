import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')

test('an attribute line at a task item quote column after > + is an attribute (carve#5337)', () => {
  assert.equal(html('- [ ] > +\n      {.c}\n      p\n'),
    '<ul class="task-list"><li><input type="checkbox" disabled> <blockquote><p class="c">p</p></blockquote></li></ul>')
  assert.match(html('- [x] > +\n      {#i}\n      {.c}\n      p\n'), /<blockquote><p id="i" class="c">p<\/p><\/blockquote>/)
  assert.match(html('- [ ] > +\n      {.c}\n      # h\n'), /<blockquote><h1 class="c" id="h">h<\/h1><\/blockquote>/)
  assert.match(html('- [ ] > +\n      {.c}\n      > q\n'), /<blockquote><blockquote class="c"><p>q<\/p><\/blockquote><\/blockquote>/)
  assert.match(html('- - [ ] > +\n        {.c}\n        p\n'), /<blockquote><p class="c">p<\/p><\/blockquote>/)
})

test('the same line read as the plain item and a refused + keeps its reading (carve#5337)', () => {
  assert.equal(html('- > +\n  {.c}\n  p\n'), '<ul><li><blockquote><p class="c">p</p></blockquote></li></ul>')
  assert.match(html('> - [ ] > +\n>       {.c}\n>\n>       p\n'), /<blockquote><\/blockquote><p class="c">p<\/p><\/li>/)
})
