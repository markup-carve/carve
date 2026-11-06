import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#5285: the blank before the note separates the item's content, so the
// block the note's body holds cannot change the item's looseness.
const html = source => renderDoc(parse(source)).replace(/\n[ \t]*(?=<)/g, '').trim()
const bodies = {
  paragraph: ['x'],
  list: ['- i', '  - j'],
  'ordered list': ['1. i', '  2. j'],
  quote: ['> q', '  > s'],
  'list with a blank': ['- i', '', '  - j'],
  'quote with a blank': ['> q', '', '  > s'],
}

for (const [marker, sibling] of [['- ', '- b'], ['1. ', '2. b']]) for (const [name, body] of Object.entries(bodies)) {
  test(`a blank before a note holding a ${name} loosens a ${marker.trim()} item`, () => {
    const base = ' '.repeat(marker.length)
    const lines = [marker + 'r[^n]', '', base + '[^n]: ' + body[0], ...body.slice(1).map(l => l && base + '  ' + l), sibling]
    const out = html(lines.join('\n') + '\n')
    assert.match(out, /<li><p>r<a [^>]*><sup>1<\/sup><\/a><\/p><\/li><li><p>b<\/p><\/li>/)
  })
}

test('the note list itself stays tight', () => {
  const out = html('- r[^n]\n\n  [^n]: - i\n    - j\n- b\n')
  assert.match(out, /<li id="fn1"><ul><li>i<\/li><li>j<\/li><\/ul>/)
})

test('without the blank the item stays tight', () => {
  const out = html('- r[^n]\n  [^n]: - i\n    - j\n- b\n')
  assert.match(out, /<li>r<a [^>]*><sup>1<\/sup><\/a><\/li><li>b<\/li>/)
})
