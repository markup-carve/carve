/*
 * A DEGRADED `%%%` IS THE `%%` LINE FORM -- PART 0, PART 9 §28, carve#1901.
 *
 * PART 0's layout automaton states the substitution under COMMENTS ARE
 * CLASSIFIED BEFORE BLOCK OWNERSHIP (carve#1731): "An opener without an
 * exact-width closer is one `%%` line comment; later lines are classified
 * normally." §28 says it from the construct side -- an opener with no matching
 * closer ahead "does NOT open a block. The line degrades to a `comment_line`".
 *
 * So inside a list item the two spellings cannot answer differently at one
 * column, and §24 C3 is why it matters at all: the comment exception names
 * "BOTH SPELLINGS: the `%%` line form and the `%%%` fence form" in one breath.
 *
 * WHAT WAS MEASURED. carve#1901 reported the item host splitting from the
 * content column upward. Four readers were compared: the executable spec, the
 * pinned carve-js build, carve-rs through the published wasm build, and
 * carve-php at its main tip. Three answer the whole band the way the clause
 * reads; carve-js alone gives the degraded fence a third answer, which is
 * markup-carve/carve-js#1600.
 *
 * WHY THE ENGINE IS NOT READ HERE, unlike its neighbour
 * `a-comment-below-a-quote-is-not-quoted-text.test.mjs`. The pinned build
 * DISAGREES with the clause on this shape, so an assertion of agreement would
 * be red and an assertion of disagreement would be a check that has to be
 * deleted the day the engine is fixed. The comparison is carried instead by the
 * authored sample added to docs/parsing-ambiguities.md and its line in
 * `resources/oracle-divergence.txt`, which fails in BOTH directions: if the
 * oracle moves to the engine's answer the declaration goes stale, and so does
 * it when the engine is fixed. This file pins the oracle and nothing else.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const oracle = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').trim()

/*
 * Every unterminated spelling of the fence. The delimiter run and the
 * insignificant tail (§28) are both varied, because a reader that keyed on the
 * tail rather than on the missing closer would pass a single-spelling test.
 */
const FENCES = ['%%%', '%%% ', '%%% t', '%%%%', '%%%%%', '%%%x']
const LINE = '%% z'

const item = (payload, column) => `- x\n${' '.repeat(column)}${payload}\ny\n`

const INSIDE = '<ul> <li>x y </li> </ul>'
const OUTSIDE = '<ul> <li>x</li> </ul> <p>y</p>'

/*
 * `- x` has content column 2. Column 1 is below it, where the comment leaves
 * the item open and `y` reaches it; 2 and past are at or above it, where the
 * comment ends the paragraph under it and `y` lands outside. Column 0 is not
 * here -- it is the open question below.
 */
const BAND = [
  [1, INSIDE],
  [2, OUTSIDE],
  [3, OUTSIDE],
  [4, OUTSIDE],
  [5, OUTSIDE],
]

for (const [column, expected] of BAND) {
  test(`the line form at column ${column} of a list item answers as the clause reads`, () => {
    assert.equal(oracle(item(LINE, column)), expected)
  })

  for (const fence of FENCES) {
    test(`an unterminated ${JSON.stringify(fence)} at column ${column} answers as the line form does`, () => {
      assert.equal(oracle(item(fence, column)), oracle(item(LINE, column)))
      assert.equal(oracle(item(fence, column)), expected)
    })
  }
}

/*
 * THE CONTROL THAT MAKES IT A RULE RATHER THAN AN ARTIFACT OF DEGRADATION.
 *
 * A fence that DOES close, at the same column, is not reached by §28 at all --
 * it is an ordinary comment block. It answers the same way, so the band above
 * is what a comment does at that column and not what the fallback path does.
 * carve-js gets this row right and the degraded one wrong, which is the whole
 * of markup-carve/carve-js#1600.
 */
for (const [column, expected] of BAND) {
  test(`a TERMINATED comment fence at column ${column} answers the same way`, () => {
    const pad = ' '.repeat(column)
    assert.equal(oracle(`- x\n${pad}%%%\n${pad}c\n${pad}%%%\ny\n`), expected)
  })
}

/*
 * THE HOST CONTROL. At the top level the two spellings agree in every reader,
 * carve-js included, so the item is the host that moved rather than the
 * degradation rule being unimplemented anywhere.
 */
for (let column = 0; column <= 3; column += 1) {
  test(`at the top level both spellings close the paragraph at column ${column}`, () => {
    const pad = ' '.repeat(column)
    assert.equal(oracle(`x\n${pad}%%%\ny\n`), '<p>x</p> <p>y</p>')
    assert.equal(oracle(`x\n${pad}${LINE}\ny\n`), '<p>x</p> <p>y</p>')
  })
}

/*
 * THE POSITIVE CONTROL. A reader that dropped every indented line would satisfy
 * everything above, so an ordinary one must still fold into the item.
 */
test('an ordinary indented line still folds into the item', () => {
  assert.equal(oracle('- x\n  z\ny\n'), '<ul> <li>x z y</li> </ul>')
})

/*
 * COLUMN 0 IS DECIDED -- markup-carve/carve#1903.
 *
 * It used to be recorded here rather than decided, because the two spellings
 * parted in EVERY reader and a terminated fence sided with the degraded one, so
 * §28's substitution did not obviously separate them. The ruling is that it
 * does: the degradation is a CLASSIFICATION and it is TOTAL, so a degraded
 * opener is a `comment_line` for ownership as well as for rendering, and §24
 * C3's "does not close the ITEM either" reaches it unchanged.
 *
 * The TERMINATED fence at that column keeps its own answer, and the pair below
 * is the reason the rule is not "a comment never closes anything": one of them
 * is a comment BLOCK at the document's own opener column and the other is not a
 * block at all.
 */
test('at column 0 the line form keeps the follower in the item', () => {
  assert.equal(oracle(item(LINE, 0)), INSIDE)
})

for (const fence of FENCES) {
  test(`at column 0 an unterminated ${JSON.stringify(fence)} answers as the line form does -- carve#1903`, () => {
    assert.equal(oracle(item(fence, 0)), oracle(item(LINE, 0)))
    assert.equal(oracle(item(fence, 0)), INSIDE)
  })
}

test('at column 0 a terminated comment fence still ends the item', () => {
  assert.equal(oracle('- x\n%%%\nc\n%%%\ny\n'), OUTSIDE)
})
