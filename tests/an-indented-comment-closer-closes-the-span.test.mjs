/*
 * A COMMENT FENCE'S CLOSER IS THE SAME DELIMITER AT EVERY COLUMN, so it cannot
 * decide a list item's tightness (carve#2471).
 *
 * `comment_block_open` and `comment_block_close` in
 * resources/spec/04-blocks-tables-containers.ebnf each carry a `[whitespace]`
 * slot, and the note above them states the consequence: leading whitespace is
 * not part of the delimiter, "so the length match below compares runs and an
 * indented closer closes an indented opener". Two documents that differ only in
 * the closer's column are therefore the same block structure, and §17 L1b
 * (CARVE-P9-030) then decides the tightness off the blank line the invisible run
 * appears to interrupt: the separation is intact and the item is LOOSE.
 *
 * The item collector's incremental fence tracker matched the closer with
 * COMMENT_FENCE_BODY, which is anchored with no leading-whitespace slot, while
 * the pass that decides the span EXISTS (`commentFenceCloserAhead`) uses the
 * indentation-insensitive form. So a closer past the block's base opened nothing
 * and cleared nothing: the span latched to the end of the item, the blank line
 * below it read as fence content rather than as a separator, and the item came
 * out TIGHT where the flush spelling of the same document is LOOSE.
 *
 * WHY THE FLUSH READING IS THE ONE THAT WINS. All three engines answer LOOSE on
 * every row of the band - measured 2026-09-28 against carve-js `936d28636`,
 * carve-php `c5aa6f1f` and carve-rs `7133607d0`, built from source - so the
 * oracle was the only reader that made tightness turn on the closer's column,
 * and it is the oracle that moves.
 *
 * The guards below are the reason this file is longer than the rule. The defect
 * makes an item TIGHT that should be LOOSE, so an over-correction that stops
 * tracking the span at all would satisfy the rows above and silently drop
 * carve#985's interior-blank rule. Each guard names a shape that must stay as it
 * is: a blank INSIDE the span, an item with no blank at all, and an unterminated
 * fence, which opens no span and is one `%%` line comment.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

/*
 * Tightness read off the OUTPUT rather than off `list.tight`, because that is
 * where it is observable: a tight item suppresses the `<p>` around its paragraph
 * children, so `<p>head</p>` present is exactly the loose reading.
 */
const looseness = (src) => (renderDoc(parse(src)).includes('<p>head</p>') ? 'loose' : 'tight')

/** `- head`, a blank, an erased `%%%` span, a blank, `tail`. Content column 2. */
const banded = (openerCol, closerCol) => {
  const opener = ' '.repeat(openerCol)
  const lines = ['- head', '', `${opener}%%%`, `${opener}a`]
  if (closerCol !== null) lines.push(`${' '.repeat(closerCol)}%%%`)
  return [...lines, '', '  tail', ''].join('\n')
}

test('the ticket pair is one document read two ways', () => {
  const flush = banded(2, 2)
  const indented = banded(2, 4)
  // Guards the pair itself: if these stop differing by the closer's column
  // alone, everything below is about some other pair of documents.
  assert.equal(indented, flush.replace('\n  %%%\n\n', '\n    %%%\n\n'))
  assert.equal(
    looseness(indented),
    looseness(flush),
    'indenting the closer moved the item, and indentation is not part of the delimiter',
  )
})

test('every column in the band closes the span, so every row is loose', () => {
  // The band is any offset between the opener's column and the container's
  // content column, plus the over-indented opener spelling, which establishes
  // its own authored base (carve#1705). The last row has no closer at all: it
  // opens nothing, and a separator survives there for a different reason.
  const rows = [
    ['content column, closer at the content column', 2, 2],
    ['content column, closer past it', 2, 4],
    ['past the content column, closer at its own base', 4, 4],
    ['past the content column, closer below that base', 4, 3],
    ['past the content column, closer at the content column', 4, 2],
    ['past the content column, no closer', 4, null],
  ]
  for (const [label, opener, closer] of rows) {
    assert.equal(looseness(banded(opener, closer)), 'loose', label)
  }
})

test('an ordered item answers the same, so the rule is not the bullet', () => {
  assert.equal(looseness('1. head\n\n   %%%\n   a\n     %%%\n\n   tail\n'), 'loose')
})

test('GUARD: a blank INSIDE the span is fence content at any closer column', () => {
  // carve#985's rule, and the one an over-correction would drop. No blank sits
  // outside the span in any of these, so the item is tight and stays tight.
  assert.equal(looseness('- head\n  %%%\n  a\n\n  b\n  %%%\n  tail\n'), 'tight')
  assert.equal(looseness('- head\n  %%%\n  a\n\n  b\n    %%%\n  tail\n'), 'tight')
  assert.equal(looseness('- head\n    %%%\n    a\n\n    b\n    %%%\n  tail\n'), 'tight')
})

test('GUARD: an item with no blank line at all is tight', () => {
  assert.equal(looseness('- head\n  %%%\n  a\n  %%%\n  tail\n'), 'tight')
  assert.equal(looseness('- head\n  %%%\n  a\n    %%%\n  tail\n'), 'tight')
})

test('GUARD: a span with no interior blank leaves the blank below it a separator', () => {
  // The narrowest statement of the fix: the only blank is AFTER the indented
  // closer, so the closer has to be honored for the separator to survive.
  assert.equal(looseness('- head\n  %%%\n  a\n    %%%\n\n  tail\n'), 'loose')
})

test('GUARD: an unterminated comment fence opens no span', () => {
  // §28: an opener with no exact-width closer ahead opens NOTHING and is one
  // `%%` line comment. Loose here because the blank lines are ordinary
  // separators, not because a span was closed.
  assert.equal(looseness('- head\n\n  %%%\n  a\n\n  tail\n'), 'loose')
  assert.equal(looseness('- head\n\n    %%%\n    a\n\n  tail\n'), 'loose')
})

test('GUARD: the code and colon fences are untouched by this change', () => {
  // A different delimiter and a different question. `PURE_FENCE` and
  // `COLON_CLOSER` are anchored the same way COMMENT_FENCE_BODY was, but all
  // four readers already agree on these two rows - measured alongside the ones
  // above - so nothing here is the same defect and neither was widened into.
  const code = '```'
  assert.equal(looseness(`- head\n\n  ${code}\n  a\n  ${code}\n\n  tail\n`), 'loose')
  assert.equal(looseness(`- head\n\n  ${code}\n  a\n    ${code}\n\n  tail\n`), 'tight')
  assert.equal(looseness('- head\n\n  ::: note\n  a\n  :::\n\n  tail\n'), 'loose')
  assert.equal(looseness('- head\n\n  ::: note\n  a\n    :::\n\n  tail\n'), 'tight')
})
