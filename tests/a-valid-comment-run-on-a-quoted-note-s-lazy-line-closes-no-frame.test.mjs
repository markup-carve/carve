import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

// carve#5893: the invisible run must not change where the unprefixed marker goes.
test('an unprefixed marker after a valid comment run in a quoted note opens a list', () => {
  const rendered = html('> [^n]: b\n> {% c\n>   z %}\n- s\n\nx[^n]\n')
  assert.ok(rendered.startsWith('<blockquote>\n\n</blockquote>\n<ul>\n  <li>s</li>\n</ul>'), rendered)
  assert.ok(rendered.includes('<p>b\n<a href="#fnref1"'), rendered)
})

test('the note reads like the item and the prose controls', () => {
  for (const source of ['> - b\n> {% c\n>   z %}\n- s\n', '> [^n]: b\n> c\n- s\n\nx[^n]\n', '> > [^n]: b\n> > {% c\n> >   z %}\n- s\n\nx[^n]\n']) {
    assert.ok(html(source).includes('</blockquote>\n<ul>\n  <li>s</li>\n</ul>'), source)
  }
})

test('a refused lazy comment run in a quoted note is still paragraph text', () => {
  assert.ok(html('> [^n]: b\n> {% c\n>  z %}\n- s\n\nx[^n]\n').includes('<p>b\n{% c\nz %}'))
})
