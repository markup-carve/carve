/*
 * A `]` in a trailing ATTRIBUTE BLOCK closes the bracketed run around it.
 *
 * grammar.ebnf's close scan skips the interior of the three spans whose content
 * is LITERAL, and the reason it gives is the whole test: a `]` there cannot be
 * escaped. An attribute block is not that span's content - it is trailing
 * metadata, its values are quoted, and the run it sits inside sees the bracket.
 *
 * The distinction has no corpus case because it cannot have one: the pinned
 * build and the oracle disagree about whether an attribute block attaches to an
 * editorial comment at all, which is a separate, pre-existing divergence with
 * nothing to do with brackets. What they DO agree on is the part this file
 * pins - where the run ends - so that half is asserted here rather than left to
 * a fixture that could not be written.
 *
 * Without it, `brContent` naming the full `litInline` / `edComment` rules
 * instead of their bodies would consume the attribute block, skip its bracket,
 * and turn these lines into links. That is what happened in the first draft of
 * carve#1197, and no gate in this repository would have said so.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const cases = [
  ['an editorial comment', 'a [t{# c #}{title="]"}x](/u) b'],
  ['an inline literal', 'a [t!`c`{title="]"}x](/u) b'],
  ['a code span', 'a [t`c`{title="]"}x](/u) b'],
  ['an image alt text', 'a ![t{# c #}{title="]"}x](/u) b'],
]

for (const [what, src] of cases) {
  test(`a bracket in the attribute block of ${what} ends the run`, () => {
    const html = renderDoc(parse(src))
    assert.ok(
      !/<a /.test(html) && !/<img /.test(html),
      `the run should have closed inside the attribute block, leaving the line literal:\n  ${src}\n  ${html}`,
    )
  })
}

test('the same lines DO build the construct when the attribute block holds no bracket', () => {
  // The control. Without it the assertions above pass for any reason at all -
  // a parse failure, a refusal, a renderer that emits no anchors.
  assert.match(renderDoc(parse('a [t{# c #}{title="q"}x](/u) b')), /<a href="\/u">/)
  assert.match(renderDoc(parse('a ![t{# c #}{title="q"}x](/u) b')), /<img /)
})
