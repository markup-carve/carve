import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// carve#5298: a line that misses the span's owner ends the span (PART 0 S1), so it can close the container.
test('a container closer below an item ends the item span and closes the container', () => {
  assert.equal(html('::: note\n- i\n  %%%\n  x\n:::\n'), [
    '<aside class="admonition note" aria-label="Note">',
    '  <ul>',
    '    <li>i</li>',
    '  </ul>',
    '</aside>',
  ].join('\n'))
})

test('a span closer below a nested item column still closes that span, and the container closes after it', () => {
  assert.equal(html('::: note\n- a\n  1. %%%\n     n\n %%%\n:::\n'), [
    '<aside class="admonition note" aria-label="Note">',
    '  <ul>',
    '    <li>a',
    '      <ol>',
    '        <li></li>',
    '      </ol>',
    '    </li>',
    '  </ul>',
    '</aside>',
  ].join('\n'))
})

// carve#5307: the closer below the quote changes no ownership, so the blank before `u` loosens the item.
test('a quote span closed below the quote leaves the next block loose', () => {
  const loose = [
    '<ul>',
    '  <li><p>a</p>',
    '    <blockquote>',
    '',
    '    </blockquote>',
    '    <p>u</p>',
    '  </li>',
    '</ul>',
  ].join('\n')
  assert.equal(html('- a\n  > %%%\n  %%%\n\n  u\n'), loose)
  assert.equal(html('- a\n  > %%%\n %%%\n\n  u\n'), loose)
  assert.equal(html('- a\n  > %%%\n  > %%%\n\n  u\n'), loose)
})
