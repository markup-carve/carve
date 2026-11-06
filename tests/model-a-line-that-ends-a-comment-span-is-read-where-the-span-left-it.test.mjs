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

// carve#5300 shape 1: the span ended the body's paragraph, so the line reaches only the document.
for (const [host, body] of [[':: t\n: a', 'dd'], ['[^n]: a', 'note'], ['- a', 'item']]) {
  test(`a column-0 line after a marker-line span in a ${body} body leaves the body`, () => {
    const out = html(`${host}\n  . %%%\n    n\nzz\n${body === 'note' ? '\n[^n]\n' : ''}`)
    assert.match(out, body === 'note' ? /^<p>zz<\/p>/ : /<p>zz<\/p>$/)
    assert.equal(out.match(/zz/g).length, 1)
  })
}

// carve#5300 section 2: a comment line below the column stays in the line block's span; the next line folds into the stanza (carve#4956).
test('a line after a below-column comment line folds into a note stanza', () => {
  assert.match(html('[^n]: ::: |\n  x\n  %%%\n%% c\nmore\n\n[^n]\n'), /<p>x<br>\nmore<\/p>/)
})

test('a quoted item stanza span closed below the item keeps the stanza for a lazy line', () => {
  assert.match(html('> - ::: |\n>   x\n>   %%%\n> %% c\n> %%%\nmore\n'), /<p>x<br>\nmore<\/p>/)
})

test('a block-shaped line after a note stanza span still leaves the note', () => {
  assert.match(html('[^n]: ::: |\n  x\n  %%%\n# h\n\n[^n]\n'), /<h1>h<\/h1>/)
  assert.match(html('[^n]: ::: |\n  x\n  %%%\n:::\n\n[^n]\n'), /^<div>/)
})
