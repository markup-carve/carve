import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source)).trim()

test('a marker-line comment keeps its authored continuation columns', () => {
  assert.equal(html('- {% a\n   {lang=de}\n   z %} y'), '<ul>\n  <li> y</li>\n</ul>')
  assert.equal(html('1. {% a\n    {#id}\n    z %} y'), '<ol>\n  <li> y</li>\n</ol>')
  assert.equal(html('> - {% a\n>    {.x}\n>    z %} y'), '<blockquote>\n  <ul>\n    <li> y</li>\n  </ul>\n</blockquote>')
})

test('a body-line comment keeps its authored continuation columns', () => {
  assert.equal(html('- p\n  {% a\n   {lang=de}\n   z %} y'), '<ul>\n  <li>p\n y</li>\n</ul>')
})

test('a continuation at the opening brace still refuses the run', () => {
  assert.equal(html('- {% a\n  {lang=de}\n   z %} y'), '<ul>\n  <li>{% a\n{lang=de}\nz %} y</li>\n</ul>')
})

test('notes and descriptions compare against their marker-line comment column', () => {
  const note = (indent) => html(`[^n]: {% a\n${' '.repeat(indent)}{x}\n${' '.repeat(indent)}z %} y\n\nsee[^n]`)
  assert.ok(note(2).includes('<p>{% a\n{x}\nz %} y<a href="#fnref1"'))
  assert.ok(note(3).includes('<p> y<a href="#fnref1"'))
  assert.equal(html(':: t\n: {% a\n  {x}\n  z %} y'), '<dl>\n  <dt>t</dt>\n  <dd>{% a\n{x}\nz %} y</dd>\n</dl>')
  assert.equal(html(':: t\n: {% a\n   {x}\n   z %} y'), '<dl>\n  <dt>t</dt>\n  <dd> y</dd>\n</dl>')
})
