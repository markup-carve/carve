/*
 * The advice in docs/portable-whitespace.md is real, and still real.
 *
 * That page tells authors that a particular whitespace form keeps their source
 * valid Djot. Each case below is a PAIR: the form the page warns about, pinned
 * as differing between the two engines, and the form the page recommends,
 * pinned as agreeing. A failure on the first means the divergence went away and
 * the advice is now noise; a failure on the second means the recommended form
 * stopped being portable, which is worse - the page would be actively wrong.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse as djotParse, renderHTML as djotRender } from '@djot/djot'
import { carveToHtml } from '@markup-carve/carve'

const normalize = (html) =>
  html.replace(/>\s+/g, '>').replace(/\s+</g, '<').replace(/\s+/g, ' ').trim()

const CASES = [
  // portable-quote-marker-space
  { rule: 'quote-space', input: '>quote\n', differs: true, note: 'marker with no space after it' },
  { rule: 'quote-space', input: '> quote\n', differs: false, note: 'marker with a space' },
  { rule: 'quote-space', input: '>> q\n', differs: true, note: 'Djot has no ">>" marker' },
  { rule: 'quote-space', input: '> > q\n', differs: false, note: 'each nested marker spaced' },
  { rule: 'quote-space', input: '>\tq\n', differs: false, note: 'a tab after the marker is fine in both' },
  { rule: 'quote-space', input: '> a\n>\n> b\n', differs: false, note: 'a bare ">" separator line is fine in both' },
  { rule: 'quote-space', input: '> ok\n>bad\n', differs: true, note: 'an unspaced marker on a continuation line' },
  { rule: 'quote-space', input: '> ok\n> good\n', differs: false, note: 'every continuation marker spaced' },
  { rule: 'quote-space', input: '> ok\nbad\n', differs: false, note: 'a lazy continuation line carries no marker in either' },
]

for (const { rule, input, differs, note } of CASES) {
  test(`portable-whitespace ${rule}: ${note}`, () => {
    const carve = normalize(carveToHtml(input))
    const djot = normalize(djotRender(djotParse(input)))
    if (differs) {
      assert.notEqual(
        carve,
        djot,
        `docs/portable-whitespace.md warns about this form, and it no longer diverges.\n` +
          `  input: ${JSON.stringify(input)}\n  both now render: ${carve}\n` +
          `  The page is what is wrong here, not this test - drop the advice.`,
      )
    } else {
      assert.equal(
        carve,
        djot,
        `docs/portable-whitespace.md recommends this form, and it is no longer portable.\n` +
          `  input: ${JSON.stringify(input)}\n  carve: ${carve}\n  djot:  ${djot}`,
      )
    }
  })
}
