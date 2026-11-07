/*
 * carve#5391. A list a quote's `+` attaches ends with the quote at the blank
 * (PART 9 §17 L3), so a paragraph after that blank is the outer item's own
 * block and loosens the list (§17 L1), as it does for the prefixed quote.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

const loose = [
  '<ul>',
  '  <li><p>x</p>',
  '    <blockquote>',
  '      <ul>',
  '        <li>t</li>',
  '      </ul>',
  '    </blockquote>',
  '    <p>u</p>',
  '  </li>',
  '</ul>',
].join('\n')

test('a paragraph at the attached item column after the blank is the outer item paragraph', () => {
  assert.equal(html('- x\n  > +\n  - t\n\n    u\n'), loose)
})

test('the attached and the prefixed quote read the same', () => {
  assert.equal(html('- x\n  > - t\n\n    u\n'), loose)
})

test('every column inside the item reads the same', () => {
  for (const pad of ['  ', '   ', '     ']) {
    assert.equal(html(`- x\n  > +\n  - t\n\n${pad}u\n`), html(`- x\n  > - t\n\n${pad}u\n`), JSON.stringify(pad))
  }
})

test('without the blank the list stays tight', () => {
  assert.match(html('- x\n  > +\n  - t\n- y\n'), /<li>x\n/)
})
