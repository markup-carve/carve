import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a column-0 comment before a sibling keeps the blank that loosens the list (carve#5031)', () => {
  assert.equal(html('- a\n\n  %% y\n%% z\n- c\n'), html('- a\n\n  %% y\n- c\n'))
  assert.equal(html('- a\n\n  %% y\n%% z\n- c\n'), '<ul>\n  <li><p>a</p></li>\n  <li><p>c</p></li>\n</ul>')
  // The blank sits inside the span and its closer follows it, so it is interior (carve#5030).
  assert.equal(html('- %%%\n\n%%%\n%% z\n- c\n'), '<ul>\n  <li></li>\n  <li>c</li>\n</ul>')
})

test('item content after a marker-line span keeps the list tight (carve#5029)', () => {
  const tight = '<ul>\n  <li>c</li>\n  <li>d</li>\n</ul>'
  assert.equal(html('- %%%\n\n  %%%\n  c\n- d\n'), tight)
  assert.equal(html('- %%%\n\n%%%\n\n  c\n- d\n'), tight)
  assert.equal(html('- %%%\n\n%%%\n  c\n- d\n'), tight)
})

test('an indented + in a note a + host skips is a letter of the note (carve#5034)', () => {
  const doc = html('[^a]: +\n[^n]: a\n +\npara\n> q\n\nsee[^n] [^a]\n')
  assert.match(doc, /<li id="fn1">\n\s*<p>a\n\+\npara<a /)
  assert.match(doc, /<li id="fn2">\n\s*<blockquote><p>q<\/p><\/blockquote>/)
  const item = html('- +\n[^n]: a\n +\npara\n> q\n\nsee[^n]\n')
  assert.match(item, /^<ul>\n  <li>\n    <blockquote><p>q<\/p><\/blockquote>\n  <\/li>\n<\/ul>/)
  assert.match(item, /<p>a\n\+\npara<a /)
})
