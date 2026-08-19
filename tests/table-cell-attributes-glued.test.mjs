/*
 * A cell's attribute block needs no space after it, and an invalid payload is
 * literal content rather than grounds for refusing the document.
 *
 * §5 says an attribute block glued to the cell sets the cell's attributes
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
  assert.match(html(table('|{.hl}Total| 99 |')), /<th scope="col" class="hl">Total<\/th>/)
})

test('a spaced attribute block still applies', () => {
  // The form corpus 99 pins. It must not regress while widening the other.
  assert.match(html(table('|{.hl} Total | 99 |')), /<th scope="col" class="hl">Total<\/th>/)
})

test('several spaces after the block are still layout, not content', () => {
  assert.match(html(table('|{.hl}   Total | 99 |')), /<th scope="col" class="hl">Total<\/th>/)
})

test('an attribute block on a body cell applies glued too', () => {
  // The header row is a different code path from a data cell; §5 glues both.
  const out = html('| h | i |\n|---|---|\n|{.hl}x| y |\n')
  assert.match(out, /<td class="hl">x<\/td>/, out)
})

test('an invalid payload is literal content, not a refusal', () => {
  // Both spacings, because the spaced one is what used to throw.
  assert.match(html(table('|{bad!!} Total | 99 |')), /<th scope="col">\{bad!!\} Total<\/th>/)
  assert.match(html(table('|{bad!!}Total| 99 |')), /<th scope="col">\{bad!!\}Total<\/th>/)
})

test('a cell whose content is only an attribute block still carries it', () => {
  const out = html(table('|{.hl}| 99 |'))
  assert.match(out, /<th scope="col" class="hl">/, out)
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
  assert.match(html(table('| Total | 99 |')), /<th scope="col">Total<\/th>/)
})

test('a brace run that never closes stays literal', () => {
  // No closing `}`, so there is no attribute block to test for validity.
  assert.match(html(table('|{.hl Total | 99 |')), /<th scope="col">\{\.hl Total<\/th>/)
})

/*
 * §5 T10: the block binds AFTER the kind marker and after the alignment
 * marker. The cases above all write a cell with NO marker, where every
 * candidate order agrees - which is exactly why the corpus could not see the
 * defect (carve#1224). These pin the positions that tell the orders apart.
 */

test('a header cell may carry attributes', () => {
  // Unspellable before T10: `header_cell` had no attributes slot at all.
  assert.match(html('|={#x} R |\n'), /<th scope="col" id="x">R<\/th>/)
})

test('the block follows the alignment marker on a header cell', () => {
  const out = html('|=~{#x} R |\n')
  assert.match(out, /<th scope="col" id="x" style="text-align: center;">R<\/th>/, out)
})

test('the block follows the alignment marker on a data cell', () => {
  const out = html('|>{.num} 9 |\n')
  assert.match(out, /<td class="num" style="text-align: right;">9<\/td>/, out)
})

test('a marker written AFTER the block is content, not alignment', () => {
  // The retired order. `<` is no longer in a marker position, so the cell
  // carries the attributes and is not aligned.
  const out = html('|{#x}< content |\n')
  assert.match(out, /<td id="x">&lt; content<\/td>/, out)
  assert.ok(!out.includes('text-align'), out)
})

test('the ambiguous shape is still a data cell', () => {
  // `|{#x}=R|` is what a writer produced for an attributed header cell while
  // the block bound ahead of the `=`. It reads as a data cell whose content
  // starts with `=`, which is the round-trip failure T10 removes.
  assert.match(html('|{#x}=R|\n'), /<td id="x">=R<\/td>/)
})

test('a space still keeps the block literal after a marker', () => {
  const out = html('|= {.x} h |\n')
  assert.match(out, /<th scope="col">\{\.x\} h<\/th>/, out)
})

test('row attributes did not move', () => {
  // T8 is unchanged and composes with a cell block in the new position.
  const out = html('|>{.c} a |{.r}\n')
  assert.match(out, /<tr class="r">/, out)
  assert.match(out, /<td class="c" style="text-align: right;">a<\/td>/, out)
})
