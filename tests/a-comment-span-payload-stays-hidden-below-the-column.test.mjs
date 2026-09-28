/*
 * A COMMENT SPAN'S PAYLOAD IS NEVER PUBLISHED, WHATEVER COLUMN ITS CLOSER SITS
 * AT (carve#2484).
 *
 * §28 opens a `fenced_comment` when an exact-width closer is ahead, and
 * carve#2471/#2475 already ruled that indentation is not part of either
 * delimiter. The item collector's below-column branch then broke on ANY open
 * opaque body, so a closer written below the host's content column ended the
 * item ON the closer: the item's own parse saw an opener with no closer among
 * its lines, which §28 makes one `%%` line comment, and PUBLISHED the payload
 * while dropping both delimiters.
 *
 * The two controls in the ticket - the closer at the opener's own base, and the
 * same pair at document level - already hid it, so the closer's column was the
 * only parameter, and a comment that renders differently at different columns is
 * a comment that renders.
 *
 * WHY THE HIDING READING IS THE ONE THAT WINS. carve-js `479383f48`, carve-php
 * `5db15ff9` and carve-rs `018b0e443`, each built from source and run on
 * 2026-09-28, hide the payload on the ticket's reproducer and answer it exactly
 * as they answer the base-closer control. The oracle was the only reader that
 * made the payload's visibility turn on the closer's column.
 *
 * The guards below are most of this file, because the defect is a column
 * boundary and an over-correction passes the rows above it. A comment's
 * DELIMITER is what the exemption covers; a payload line below the column is not
 * comment-shaped, so it still ends the container, and `- head` / `    %%%` / `X`
 * / `%%%` ends the item at `X` in all three engines.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))

/** `- head`, a blank, a `%%%` span opened at `openerCol`, a blank, `  tail`. */
const banded = (openerCol, closerCol) => {
  const opener = ' '.repeat(openerCol)
  const lines = ['- head', '', `${opener}%%%`, `${opener}HIDDEN`]
  if (closerCol !== null) lines.push(`${' '.repeat(closerCol)}%%%`)
  return [...lines, '', '  tail', ''].join('\n')
}

test('the ticket reproducer hides the payload and keeps both delimiters unpublished', () => {
  const out = html(banded(4, 0))
  assert.ok(!out.includes('HIDDEN'), `the comment body reached the page:\n${out}`)
  assert.ok(!out.includes('%'), `a delimiter reached the page:\n${out}`)
})

test('the closer’s column is not a parameter: every row below the host’s content column agrees with the base-closer control', () => {
  // The controls the ticket names: the closer at the opener's own base is the
  // reading, and every column from there down to 0 has to give it.
  const control = html(banded(4, 4))
  for (let closer = 0; closer < 4; closer++) {
    assert.equal(
      html(banded(4, closer)),
      control,
      `a closer at column ${closer} read differently from one at the opener's base`,
    )
  }
})

test('the same pair at document level is unmoved', () => {
  // The ticket's second control. It already hid the payload, so it is here to
  // stay that way rather than to change.
  assert.equal(html('%%%\nHIDDEN\n%%%\n\ntail\n'), '<p>tail</p>')
  assert.equal(html('%%%\nHIDDEN\n  %%%\n\ntail\n'), '<p>tail</p>')
})

test('the span survives in every list-shaped host, and the payload with it', () => {
  for (const [label, src] of [
    ['nested item', '- o\n  - head\n\n      %%%\n      HIDDEN\n%%%\n\n    tail\n'],
    ['item inside a quote', '> - head\n>\n>     %%%\n>     HIDDEN\n> %%%\n>\n>   tail\n'],
    ['ordered item', '1. head\n\n     %%%\n     HIDDEN\n%%%\n\n   tail\n'],
    ['task item', '- [x] head\n\n    %%%\n    HIDDEN\n%%%\n\n  tail\n'],
  ]) {
    assert.ok(!html(src).includes('HIDDEN'), `${label} published the comment body`)
  }
})

test('two spans in a row each keep their own payload down', () => {
  const out = html('- head\n\n    %%%\n    A\n    %%%\n\n    %%%\n    B\n    %%%\n\n  tail\n')
  assert.ok(!out.includes('A') && !out.includes('B'), out)
})

test('GUARD: the closer at the opener’s base is unchanged, and so is the whole in-band row', () => {
  // carve#2475's band, asserted on the rendering rather than on looseness, so
  // this file fails if that fix is undone from the other side.
  const expected = '<ul>\n  <li><p>head</p>\n    <p>tail</p>\n  </li>\n</ul>'
  assert.equal(html(banded(2, 2)), expected)
  assert.equal(html(banded(2, 4)), expected)
  assert.equal(html(banded(4, 4)), expected)
  assert.equal(html(banded(4, 2)), expected)
})

test('GUARD: an unterminated comment fence opens no span, so its payload IS the item’s text', () => {
  // §28: an opener with no exact-width closer ahead opens NOTHING and is one
  // `%%` line comment. The payload is ordinary item content there, and reading
  // it as a hidden body would be the opposite over-correction.
  const out = html(banded(4, null))
  assert.ok(out.includes('HIDDEN'), `an unterminated fence swallowed its payload:\n${out}`)
})

test('GUARD: a payload line below the column still ends the container', () => {
  // Only the DELIMITER is exempt from the below-column break. `X` is not
  // comment-shaped, so §24 C3 hands it to the document exactly as before, and
  // all three engines publish it there.
  for (const closer of ['    %%%', '%%%']) {
    const out = html(`- head\n\n    %%%\nX\n${closer}\n\n  tail\n`)
    assert.ok(out.includes('<p>X</p>'), `X stopped reaching document level:\n${out}`)
    const list = out.slice(0, out.indexOf('</ul>'))
    assert.ok(!list.includes('X'), `X was consumed into the item:\n${out}`)
  }
})

test('GUARD: a sibling marker and a heading below the column still end the item', () => {
  const sibling = html('- head\n\n    %%%\n- sib\n    %%%\n\n  tail\n')
  assert.ok(sibling.includes('<li><p>sib</p>'), sibling)
  const heading = html('- head\n\n    %%%\n# H\n%%%\n\n  tail\n')
  assert.ok(heading.includes('<h1>H</h1>'), heading)
})

test('GUARD: a code fence and a colon fence in the same geometry are untouched', () => {
  // CARVE-P0-013 governs both: the container ends at the column-0 line and the
  // residue re-parses outside. The exemption above is about a construct that has
  // no body BLOCK, so neither of these may move - all three engines agree on
  // both rows, measured alongside the comment rows.
  const code = '```'
  assert.equal(
    html(`- head\n\n    ${code}\n    HIDDEN\n${code}\n\n  tail\n`),
    `<ul>\n  <li>head\n    <pre><code>HIDDEN\n</code></pre>\n  </li>\n</ul>\n<pre><code>\n  tail\n</code></pre>`,
  )
  assert.equal(
    html('- head\n\n    :::\n    HIDDEN\n:::\n\n  tail\n'),
    '<ul>\n  <li>head\n    <div>\n      <p>HIDDEN</p>\n    </div>\n  </li>\n</ul>\n<div>\n  <p>tail</p>\n</div>',
  )
})

test('GUARD: a blank INSIDE the span is still fence content', () => {
  // carve#985's rule, the one an over-correction that stopped tracking the span
  // would drop. No blank sits outside the span here, so the item is tight.
  assert.ok(!html('- head\n  %%%\n  a\n\n  b\n%%%\n  tail\n').includes('<p>head</p>'))
})
