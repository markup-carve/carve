/*
 * AN EMPTY BODY CLAIMS NOTHING BELOW COLUMN 0 -- §17 L3, carve#1821.
 *
 * `AND FLUSH-LEFT MEANS COLUMN 0` (carve#1436) names its own control: a line
 * the marker does not reach "falls through to the ordinary column rules, which
 * give it to whichever container its own column names, exactly as if the `+`
 * line had been a comment". So the rule is a RELATION between two documents,
 * and a pair of independent goldens cannot state it - only a change that
 * repairs one spelling and drifts the other shows up against the relation.
 * This file pins the relation for the FIRST-BLOCK form.
 *
 * What makes the first-block form the shape that asks the question: nowhere
 * else in a description body is the `+` a marker at all. Under an open
 * paragraph it is lazy continuation text, because a marker cannot interrupt a
 * paragraph - all four L4 containers agree on that, measured on e5130e54. In
 * `:  +` no paragraph is open, so the `+` genuinely is a marker, the clause
 * reads its payload's column, and a payload at column 1 or 2 is refused.
 *
 * The description refused nothing. Both ways of reaching the payload claimed
 * it, which is why a guard on the GATE is measurable dead code: the pull path
 * attached the line as the marked block, and with the gate guarded instead the
 * below-column fold claimed the same line into the same empty `dd`, because an
 * empty body reports a paragraph open. The guard belongs ahead of both.
 *
 * The LIST ITEM is the reference implementation, and its rows are here as the
 * control that made this a divergence rather than a rule: it already answered
 * the whole band this way, in both spellings, before anything was changed.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
  .replace(/\s+/g, ' ').replace(/> </g, '><').replace(/ (<\/)/g, '$1').trim()

// The same document twice, `+` where the control has its invisible line.
const marker = (src) => src.replace('@', '+')
const comment = (src) => src.replace('@', '%% c')

/*
 * The refused band. Column 0 is the ONLY column the marker reaches, so every
 * other column below the body's content column must answer as the comment
 * does. Column 3 is the description's own content column and column 2 is the
 * list item's, which is why each container's band stops where it does: at and
 * above the content column the payload is ordinary indented continuation and
 * the two spellings agree for a different reason, pinned below as its own row.
 */
const REFUSED = [
  ['a description, payload one column in', ':: t\n:  @\n flush\n'],
  ['a description, payload two columns in', ':: t\n:  @\n  flush\n'],
  ['a list item, the reference, payload one column in', '- @\n flush\n'],
]

for (const [what, src] of REFUSED) {
  test(`the first-block marker reaches no further than a comment does in ${what}`, () => {
    assert.equal(html(marker(src)), html(comment(src)))
  })
}

/*
 * The positive half. A form that refused everything would satisfy every
 * assertion above, so both containers are asked the SAME document with the
 * payload at column 0, where the marker does attach and the two spellings
 * DIVERGE by design - the marker names a block, the comment names nothing.
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

test('at the body\'s own content column the payload is ordinary continuation, in both spellings', () => {
  // Not the clause's doing: column 3 is inside the description and column 2 is
  // inside the item, so the payload never reaches the marker's question. The
  // row is here so a guard written one column too wide fails something.
  assert.equal(html(':: t\n:  +\n   flush\n'), '<dl><dt>t</dt><dd>flush</dd></dl>')
  assert.equal(html(':: t\n:  %% c\n   flush\n'), '<dl><dt>t</dt><dd>flush</dd></dl>')
  assert.equal(html('- +\n  flush\n'), '<ul><li>flush</li></ul>')
  assert.equal(html('- %% c\n  flush\n'), '<ul><li>flush</li></ul>')
})

/*
 * THE OTHER TWO L4 CONTAINERS GIVE A THIRD ANSWER, AND IT IS NOT THIS ONE.
 *
 * A `+` as the FIRST block of a footnote body or of a block quote is neither
 * attached nor refused: THE FIRST-BLOCK FORM IS THE ITEM AND THE DESCRIPTION
 * (§17 L4, carve#1821) and those two containers do not have it, so the `+` is
 * ordinary text and its payload lands where the ordinary column rules put it.
 *
 * These rows used to pin a REFUSAL of the whole document, `stray continuation
 * marker`, observed rather than ruled. That was the executable spec alone:
 * carve-js, carve-php and carve-rs all rendered the text, agreeing byte for
 * byte at every payload column, so one reader of four refused. The oracle
 * joined them.
 *
 * The six documents are pinned as corpus 437. What is here is the part a pair
 * of independent goldens cannot say: that the marker spelling and a PLAIN-TEXT
 * spelling of the same document are the same document, which is the whole
 * content of "the `+` is not a marker here".
 */
for (const [what, marked, plain] of [
  ['a footnote body, payload at column 0',
    '[^a]: +\nflush\n\nsee[^a]\n', '[^a]: x\nflush\n\nsee[^a]\n'],
  ['a footnote body, payload at column 1',
    '[^a]: +\n flush\n\nsee[^a]\n', '[^a]: x\n flush\n\nsee[^a]\n'],
  ['a footnote body, payload at column 2',
    '[^a]: +\n  flush\n\nsee[^a]\n', '[^a]: x\n  flush\n\nsee[^a]\n'],
  ['a block quote, payload at column 0', '> +\nflush\n', '> x\nflush\n'],
  ['a block quote, payload at column 1', '> +\n flush\n', '> x\n flush\n'],
  ['a block quote, payload at column 2', '> +\n  flush\n', '> x\n  flush\n'],
]) {
  test(`a first-block + is ordinary text in ${what}`, () => {
    assert.equal(html(marked), html(plain).replaceAll('x', '+'))
  })
}

/*
 * The positive half, so a reading that made `+` text EVERYWHERE fails here.
 * The two containers that DO have the first-block form still attach at column
 * 0, and the two that do not still have the marker in its ordinary position.
 */
test('the first-block form still attaches where §17 L4 spells it', () => {
  assert.equal(html('- +\nflush\n'), '<ul><li>flush</li></ul>')
  assert.equal(html(':: t\n:  +\nflush\n'), '<dl><dt>t</dt><dd>flush</dd></dl>')
})

test('the ordinary marker position is untouched in both other containers', () => {
  assert.equal(html('> intro\n>\n+\nmore\n'),
    '<blockquote><p>intro</p><p>more</p></blockquote>')
  assert.equal(
    html('[^a]: intro\n+\nmore\n\nsee[^a]\n').includes('<p>more<'), true)
})
