/*
 * A first-block `+` attaches only a line at its marker column (carve#4409). At
 * any other column it is a letter, so the same document with a letter differs in
 * that character alone. The comment spelling stays as a control: it names no block.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
  .replace(/\s+/g, ' ').replace(/> </g, '><').replace(/ (<\/)/g, '$1').trim()

const letter = (src) => html(src.replace('+', 'Z')).replace('Z', '+')

const REFUSED = [
  ['a description, payload one column in', ':: t\n:  +\n flush\n'],
  ['a description, payload two columns in', ':: t\n:  +\n  flush\n'],
  ['a list item, the reference, payload one column in', '- +\n flush\n'],
]

for (const [what, src] of REFUSED) {
  test(`a first-block + off the marker column is a letter in ${what}`, () => {
    assert.equal(html(src), letter(src))
  })
}

/*
 * The positive half. A form that refused everything would satisfy every
 * assertion above, so both containers are asked the SAME document with the
 * payload at the marker column, where the marker attaches.
 */
const ATTACHES = [
  ['a description', ':: t\n:  +\nflush\n', '<dl><dt>t</dt><dd>flush</dd></dl>'],
  ['a list item', '- +\nflush\n', '<ul><li>flush</li></ul>'],
]

for (const [what, src, expected] of ATTACHES) {
  test(`the first-block form still attaches a flush-left block in ${what}`, () => {
    assert.equal(html(src), expected)
  })
}

test('the column-0 marker and its comment control are the one pair that must NOT agree', () => {
  // Guards the positive half from the other direction. If the empty body ever
  // stops claiming column 0 too, every REFUSED row above still passes and only
  // this one reports it.
  assert.notEqual(html(':: t\n:  +\nflush\n'), html(':: t\n:  %% c\nflush\n'))
  assert.notEqual(html('- +\nflush\n'), html('- %% c\nflush\n'))
})

test('at the body\'s own content column the + is a letter and the payload continues it', () => {
  assert.equal(html(':: t\n:  +\n   flush\n'), '<dl><dt>t</dt><dd>+ flush</dd></dl>')
  assert.equal(html(':: t\n:  %% c\n   flush\n'), '<dl><dt>t</dt><dd>flush</dd></dl>')
  assert.equal(html('- +\n  flush\n'), '<ul><li>+ flush</li></ul>')
  assert.equal(html('- %% c\n  flush\n'), '<ul><li>flush</li></ul>')
})

/*
 * A `+` that opens a footnote body or a block quote with nothing flush-left
 * under it is ordinary text, and its payload lands where the ordinary column
 * rules put it (§17 L4, carve#1821, carve#3105). The marker spelling and a
 * plain-text spelling of the same document are the same document.
 */
for (const [what, marked, plain] of [
  ['a footnote body, payload at column 1',
    '[^a]: +\n flush\n\nsee[^a]\n', '[^a]: x\n flush\n\nsee[^a]\n'],
  ['a block quote, payload at column 1', '> +\n flush\n', '> x\n flush\n'],
  ['a block quote, payload at column 2', '> +\n  flush\n', '> x\n  flush\n'],
]) {
  test(`a first-block + is ordinary text in ${what}`, () => {
    assert.equal(html(marked), html(plain).replaceAll('x', '+'))
  })
}

/*
 * The positive half, so a reading that made `+` text EVERYWHERE fails here:
 * all four L4 containers attach a column-0 block in the first-block position.
 */
test('a first-block + in a footnote body is a letter over a payload at column 2', () => {
  assert.equal(html('[^a]: +\n  flush\n\nsee[^a]\n'), html('[^a]: Z\n  flush\n\nsee[^a]\n').replace('Z', '+'))
})

test('the first-block form still attaches where §17 L4 spells it', () => {
  assert.equal(html('- +\nflush\n'), '<ul><li>flush</li></ul>')
  assert.equal(html(':: t\n:  +\nflush\n'), '<dl><dt>t</dt><dd>flush</dd></dl>')
  assert.equal(html('> +\nflush\n'), '<blockquote><p>flush</p></blockquote>')
  assert.equal(html('[^a]: +\nflush\n\nsee[^a]\n').includes('<li id="fn1"><p>flush<'), true)
})

test('the ordinary marker position is untouched in a quote and a note', () => {
  assert.equal(html('> intro\n>\n+\nmore\n'),
    '<blockquote><p>intro</p><p>more</p></blockquote>')
  assert.equal(
    html('[^a]: intro\n+\nmore\n\nsee[^a]\n').includes('<p>more<'), true)
})
