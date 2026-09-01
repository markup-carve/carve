/*
 * THE COLUMN GATE IS ONE OPERATION IN EVERY CONTAINER -- §17 L3, carve#1814.
 *
 * `CONTINUATION-MARKER FLUSH-LEFT MEANS COLUMN 0` (carve#1436) names its own control: a line
 * the marker does not reach "falls through to the ordinary column rules, which
 * give it to whichever container its own column names, exactly as if the `+`
 * line had been a comment". So the rule is a RELATION between two documents,
 * and the corpus can only pin the two outputs. This file pins the relation: for
 * every container, the marker spelling and the comment spelling of the same
 * document must render the same thing.
 *
 * That is what the corpus could not have caught. The gate was spelled in the
 * list item's attach path and in the item collector's nested guard, and the
 * footnote body, the description and the block quote had none - and both the
 * oracle and the pinned carve-js agreed with each other on all of it, because
 * the only container anything ever asked was the one that had the gate.
 *
 * The QUOTE row uses the blank-line control instead. A comment line at column 0
 * under an open quoted paragraph is folded into it as lazy TEXT rather than
 * being skipped, which is a defect of the quote's invisible-line handling and
 * not of the marker; closing the quoted paragraph with a bare `>` first takes
 * that out of the row, and then all three controls - blank, comment, marker -
 * agree.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// Whitespace before a CLOSING tag is dropped as well as collapsed. A comment
// line inside a list item leaves a trailing space in the item's text where the
// marker leaves none - a rendering artifact of the comment's own layout, with
// nothing to say about which container the line after it reached, which is the
// only thing these rows ask.
const html = (src) => renderDoc(parse(src))
  .replace(/\s+/g, ' ').replace(/> </g, '><').replace(/ (<\/)/g, '$1').trim()

// The same document twice, `+` where the control has its invisible line.
const marker = (src) => src.replace('@', '+')
const comment = (src) => src.replace('@', '%% c')

const BAND = [
  ['a footnote body, below its minimum column', '[^a]: intro\n@\n more\n\nsee[^a]\n'],
  ['a footnote body, at its minimum column', '[^a]: intro\n@\n  more\n\nsee[^a]\n'],
  ['a description, below its content column', ':: term\n:  intro\n@\n  more\n'],
  ['a description, one column further below', ':: term\n:  intro\n@\n more\n'],
  ['a block quote, with the quoted paragraph closed', '> intro\n>\n@\n  more\n'],
  ['a list item, the container that always held the gate', '- intro\n@\n  more\n'],
]

for (const [what, src] of BAND) {
  test(`the marker reaches no further than a comment does in ${what}`, () => {
    assert.equal(html(marker(src)), html(comment(src)))
  })
}

test('the quote agrees with its blank-line control too', () => {
  const src = '> intro\n>\n@\n  more\n'
  assert.equal(html(marker(src)), html(src.replace('@\n', '')))
})

/*
 * The positive half. A gate that refused everything would satisfy every
 * assertion above, so each container is asked the SAME document one column
 * over, where the marker does attach.
 */
const ATTACHES = [
  ['a footnote body', '[^a]: intro\n+\nmore\n\nsee[^a]\n',
    '<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>' +
    '<section role="doc-endnotes" aria-label="Footnotes"><hr><ol><li id="fn1">' +
    '<p>intro</p><p>more<a href="#fnref1" role="doc-backlink" ' +
    'aria-label="Back to reference">↩</a></p></li></ol></section>'],
  ['a description', ':: term\n:  intro\n+\nmore\n',
    '<dl><dt>term</dt><dd><p>intro</p><p>more</p></dd></dl>'],
  ['a block quote', '> intro\n>\n+\nmore\n',
    '<blockquote><p>intro</p><p>more</p></blockquote>'],
  ['a list item', '- intro\n+\nmore\n', '<ul><li>intro more</li></ul>'],
]

for (const [what, src, expected] of ATTACHES) {
  test(`a column-0 block still attaches in ${what}`, () => {
    assert.equal(html(src), expected)
  })
}
