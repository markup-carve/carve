/*
 * A cell's attribute block needs no space after it, and an invalid payload is
 * literal content rather than grounds for refusing the document.
 *
 * §5 says an attribute block glued to the opening `|` sets the cell's attributes
 * and "the rest of the cell, AFTER OPTIONAL WHITESPACE, is the content". The
 * oracle demanded that whitespace, so `|{.hl}Total |` rendered the braces as
 * text. carve-js, carve-rs and carve-php all applied the attribute - the oracle
 * was alone.
 *
 * The same three lines carried a second, worse defect. §5 also says "the whole
 * brace payload must be valid attribute syntax; otherwise the `{` is literal
 * content". The validity test lived at RENDER time and threw, so a cell like
 * `|{bad!!} Total |` REFUSED the whole document where all three engines render
 * the braces as text. A refusal is the one outcome the clause rules out.
 *
 * Found by re-reading a formatter's output with the oracle instead of with the
 * engine that wrote it (carve#710): carve-js's `fmt` writes `|{.highlight}Total|`
 * with no space, which is exactly the form the oracle could not read. Corpus
 * document 99 pins the SPACED form only, which is why nothing failed.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const table = (firstRow) => `${firstRow}\n|---|---|\n| a | b |\n`

test('a glued attribute block applies', () => {
  assert.match(html(table('|{.hl}Total| 99 |')), /<th class="hl">Total<\/th>/)
})

test('a spaced attribute block still applies', () => {
  // The form corpus 99 pins. It must not regress while widening the other.
  assert.match(html(table('|{.hl} Total | 99 |')), /<th class="hl">Total<\/th>/)
})

test('several spaces after the block are still layout, not content', () => {
  assert.match(html(table('|{.hl}   Total | 99 |')), /<th class="hl">Total<\/th>/)
})

test('an attribute block on a body cell applies glued too', () => {
  // The header row is a different code path from a data cell; §5 glues both.
  const out = html('| h | i |\n|---|---|\n|{.hl}x| y |\n')
  assert.match(out, /<td class="hl">x<\/td>/, out)
})

test('an invalid payload is literal content, not a refusal', () => {
  // Both spacings, because the spaced one is what used to throw.
  assert.match(html(table('|{bad!!} Total | 99 |')), /<th>\{bad!!\} Total<\/th>/)
  assert.match(html(table('|{bad!!}Total| 99 |')), /<th>\{bad!!\}Total<\/th>/)
})

test('a cell whose content is only an attribute block still carries it', () => {
  const out = html(table('|{.hl}| 99 |'))
  assert.match(out, /<th class="hl">/, out)
})

test('there is still no attributed span marker', () => {
  // T4, unchanged: `{...}` plus a lone `^`/`<` is ordinary content, braces and
  // all - dropping the lookahead must not turn this into an attributed span.
  const out = html('| h | i |\n|---|---|\n|{.x}^| b |\n')
  assert.match(out, /\{\.x\}\^/, out)
  assert.ok(!out.includes('rowspan'), out)
})

test('an unbraced cell is untouched', () => {
  // The boundary: no braces, no change.
  assert.match(html(table('| Total | 99 |')), /<th>Total<\/th>/)
})

test('a brace run that never closes stays literal', () => {
  // No closing `}`, so there is no attribute block to test for validity.
  assert.match(html(table('|{.hl Total | 99 |')), /<th>\{\.hl Total<\/th>/)
})
