/*
 * The two word-boundary classes in the executable reference read the alphabet
 * the normative text spells, not Unicode.
 *
 * PART 9 §7 gives the mention / tag / symbol boundary as `[A-Za-z0-9_]`, and
 * the grammar header gives `alnum` - the class in the `bare_opener` /
 * `bare_closer` templates - as `letter | digit` over PART 7's enumerated ASCII
 * alphabet. Ohm's built-in `letter` and a `\p{L}\p{N}` regex both follow
 * Unicode, so `wordChar` and the delimiter guards were too WIDE on a non-ASCII
 * letter, and `wordChar` was too NARROW on the `_` §7 names.
 *
 * `scripts/formal-core-check.mjs` cannot see it: no corpus document puts a
 * marker or a bare delimiter against a non-ASCII letter or an underscore, so
 * all 1740 inputs stayed conformant with either alphabet. Hence a test rather
 * than corpus cases.
 *
 * Every row carries its ASCII control, because a boundary that suppresses
 * everything passes a suppression table on its own.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// U+00E9 (Ll), U+4F8B (Lo) and U+0430 (Ll, Cyrillic) are letters to Unicode
// and not to PART 7. The full-width digit is the same claim for `digit`.
const NON_ASCII = ['é', '例', 'а', '３']

test('a marker after a non-ASCII letter opens its construct', () => {
  for (const ch of NON_ASCII) {
    assert.match(html(`${ch}#tag x\n`), /class="tag"/, `#tag after ${ch}`)
    assert.match(html(`m${ch}@ex x\n`), /class="mention"/, `mention after ${ch}`)
    assert.equal(
      html(`${ch}:rocket:{.big} x\n`),
      `<p>${ch}<span class="big">:rocket:</span> x</p>`,
      `symbol after ${ch}`,
    )
  }
  // The ASCII control: the same markers against an ASCII letter stay literal.
  assert.equal(html('a#tag x\n'), '<p>a#tag x</p>')
  assert.equal(html('me@ex x\n'), '<p>me@ex x</p>')
  assert.equal(html('a:rocket:{.big} x\n'), '<p>a:rocket:{.big} x</p>')
})

test('a marker after an underscore opens nothing', () => {
  assert.equal(html('a_#tag x\n'), '<p>a_#tag x</p>')
  assert.equal(html('a_@ex x\n'), '<p>a_@ex x</p>')
  assert.equal(html('a_:rocket:{.big} x\n'), '<p>a_:rocket:{.big} x</p>')
  // An underscore is a word character wherever it stands, so a leading one
  // suppresses just as an intraword one does.
  assert.equal(html('_@ex x\n'), '<p>_@ex x</p>')
  assert.equal(html('_#tag x\n'), '<p>_#tag x</p>')
  // The control: a space in the same slot is not a word character.
  assert.match(html('a #tag x\n'), /class="tag"/)
  assert.match(html('a @ex x\n'), /class="mention"/)
  assert.equal(html('a :rocket:{.big} x\n'), '<p>a <span class="big">:rocket:</span> x</p>')
})

test('a marker after an ASCII letter or digit opens nothing either', () => {
  // `word` absorbs a marker only when a word character follows it, so a name
  // opening on `_` or `-` walked past the grammar's half of the boundary.
  assert.equal(html('a#_x y\n'), '<p>a#_x y</p>')
  assert.equal(html('a#-x y\n'), '<p>a#-x y</p>')
  assert.equal(html('a@_b y\n'), '<p>a@_b y</p>')
  assert.equal(html('a@-b y\n'), '<p>a@-b y</p>')
  assert.equal(html('1#_x y\n'), '<p>1#_x y</p>')
  // The control: the same names at a clean boundary are the constructs.
  assert.match(html('a #_x y\n'), /class="tag"/)
  assert.match(html('a @-b y\n'), /class="mention"/)
})

test('the boundary reaches a construct inside a span', () => {
  assert.equal(html('{*a_#t*} x\n'), '<p><strong>a_#t</strong> x</p>')
  assert.equal(html('{*a #t*} x\n'), '<p><strong>a <span class="tag"><strong>#t</strong></span></strong> x</p>')
})

test('a suppressed symbol leaves its name to smart typography', () => {
  // The suppression is a non-parse, not a literal token: `+-` inside a symbol
  // that never opened is an ordinary typographic run.
  assert.equal(html('a_:+-: x\n'), '<p>a_:±: x</p>')
  assert.equal(html('é:+-: x\n'), '<p>é:+-: x</p>')
})

test('an underscore still closes an underline when a marker follows it', () => {
  // THE TRAP. Widening `wordChar` to carry the `_` would let `word` absorb the
  // closer, and this row would fall back to literal text.
  assert.equal(html('_z_@y\n'), '<p><u>z</u>@y</p>')
  assert.equal(html('_z_#y\n'), '<p><u>z</u>#y</p>')
  assert.equal(html('_z_:rocket:{.big}\n'), '<p><u>z</u>:rocket:{.big}</p>')
  // The same closer with no marker behind it, as the baseline it has to match.
  assert.equal(html('_z_/y/\n'), '<p><u>z</u>/y/</p>')
  assert.equal(html('_z_ y\n'), '<p><u>z</u> y</p>')
})

test('an underscore that opened a span is not the character before the marker', () => {
  // The carve-out the guard needs the delimiter stack for: a paired OPENER is
  // markup, so the construct behind it stands at the start of the content.
  assert.equal(html('_:rocket:_ y\n'), '<p><u>:rocket:</u> y</p>')
  assert.equal(html('_:rocket:{.big}_ y\n'), '<p><u><span class="big">:rocket:</span></u> y</p>')
  // An underscore that pairs with nothing is content again, and suppresses.
  assert.equal(html('_:rocket:{.big} y\n'), '<p>_:rocket:{.big} y</p>')
})

test('an inline extension keeps its lack of a left boundary', () => {
  assert.equal(html('a_:kbd[x] y\n'), '<p>a_<span class="ext-kbd">x</span> y</p>')
  assert.equal(html('é:kbd[x] y\n'), '<p>é<span class="ext-kbd">x</span> y</p>')
})

test('a bare delimiter opens and closes against a non-ASCII letter', () => {
  for (const ch of NON_ASCII) {
    assert.equal(html(`${ch}*x* y\n`), `<p>${ch}<strong>x</strong> y</p>`, `open after ${ch}`)
    assert.equal(html(`y *x*${ch}\n`), `<p>y <strong>x</strong>${ch}</p>`, `close before ${ch}`)
    assert.equal(html(`${ch}/x/ y\n`), `<p>${ch}<em>x</em> y</p>`, `italic after ${ch}`)
  }
  // Intraword emphasis after a non-ASCII letter is what all three engines
  // ship. Whether the clause should read `\p{L}\p{N}` instead is a separate
  // question; this row holds the reference to what is normative today.
  assert.equal(html('café*bold*\n'), '<p>café<strong>bold</strong></p>')
  // The ASCII control: the same shapes against an ASCII letter stay literal.
  assert.equal(html('e*x* y\n'), '<p>e*x* y</p>')
  assert.equal(html('y *x*e\n'), '<p>y *x*e</p>')
  assert.equal(html('e/x/ y\n'), '<p>e/x/ y</p>')
})
