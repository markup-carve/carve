/*
 * A COMMENT IS COLUMN-EXEMPT IN THE QUOTE HOST TOO -- §10 I5, §24 C3,
 * carve#1899.
 *
 * §10 I5's first exception is about MEMBERSHIP: below a container's content
 * column the other four invisible kinds are ordinary text and fold, and a
 * comment is still a comment. §24 C3 says why the exception has to hold at
 * every column -- "folding it would make the comment VISIBLE, which is the one
 * outcome a comment may never have".
 *
 * The oracle held the rule in two hosts and not in the third. The item and
 * description collectors each test the line before folding it; the quote's
 * lazy-fold branch framed every unmarked line unconditionally, so `> x` over
 * `%% c` published the comment's own characters as quoted prose. That is the
 * §1561/#1562 direction of `resources/oracle-divergence.txt`: three engines and
 * the normative text on one side, the oracle alone on the other.
 *
 * THE TWO NEIGHBOURING HOSTS ARE THE CONTROL, not decoration. They answered
 * this band correctly before the fix and answer it identically after, which is
 * what makes the quote row a defect in one branch rather than an open question
 * about the rule.
 *
 * WHY THE ENGINE IS READ HERE. Asserting "all three engines drop it" from a
 * table would be a claim nothing in this repository can fail on. carve-js is a
 * devDependency, so the agreement is MEASURED on every run; carve-rs and
 * carve-php are not checked out beside this repo and are deliberately not
 * claimed.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToHtml } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const oracle = (src) => renderDoc(parse(src)).replace(/\s+/g, ' ').trim()
const engine = (src) => carveToHtml(src).replace(/\s+/g, ' ').trim()

/*
 * The comment sits BELOW every open content column and carries no `>` marker,
 * so it reaches the quote's paragraph only by S4's lazy fold -- the one path
 * the exemption has to survive. Column 0 and an indented column are both here
 * because the exemption is stated over ANY column.
 */
const QUOTE = [
  ['at column 0', '> x\n%% c\n'],
  ['indented', '> x\n  %% c\n'],
  ['the fence spelling', '> x\n%%%\nc\n%%%\n'],
  ['nested two deep', '> > x\n%% c\n'],
  ['inside a list item', '- > x\n%% c\n'],
]

for (const [what, src] of QUOTE) {
  test(`a comment ${what} below a quote renders nothing`, () => {
    assert.ok(!oracle(src).includes('%%'), `oracle published the comment: ${oracle(src)}`)
  })
  test(`a comment ${what} below a quote reads as carve-js reads it`, () => {
    assert.equal(oracle(src), engine(src))
  })
}

/*
 * The two hosts that always held the rule. If a later change reaches for the
 * general predicate instead of the per-host arm, these are what say so.
 */
const NEIGHBOURS = [
  ['a list item', '- a\n%% c\n', '<ul> <li>a</li> </ul>'],
  ['a list item, indented', '- a\n %% c\n', '<ul> <li>a</li> </ul>'],
  ['a description', ':: t\n: d\n%% c\n', '<dl> <dt>t</dt> <dd>d</dd> </dl>'],
]

for (const [what, src, expected] of NEIGHBOURS) {
  test(`the exemption still holds in ${what}`, () => {
    assert.equal(oracle(src), expected)
  })
}

/*
 * The positive control. A branch that dropped every unmarked line would satisfy
 * everything above, so an ordinary lazy line must still fold into the quote.
 */
test('an ordinary lazy line still folds into the quoted paragraph', () => {
  assert.equal(oracle('> x\ny\n'), '<blockquote><p>x y</p></blockquote>')
})

/*
 * And the marked spelling, which never went through the lazy branch at all --
 * the control that says the divergence was about the UNMARKED line only.
 */
test('a comment carried by its own quote marker is unchanged', () => {
  assert.equal(oracle('> x\n> %% c\n'), '<blockquote><p>x</p></blockquote>')
})
