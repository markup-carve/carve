/*
 * A colon-fence line that fails the opener test leaves the paragraph expecting a
 * closer, and the absorption is not width-tagged.
 *
 * Both halves are what all three engines do; neither was written down until
 * carve#770. §10 says which openers interrupt a paragraph - a bare `:::` does -
 * and nothing said that a malformed sibling earlier in the SAME paragraph turns
 * that interruption off for the rest of it. A grammar cannot implement a rule
 * nobody wrote, and tree-sitter-carve gets this case wrong today while its own
 * notes blame the opener line rather than the trailing fence.
 *
 * WHY THIS IS A TEST HERE AND NOT A CORPUS CASE. The obvious home is
 * `docs/examples/core.md`, which generates the corpus - and adding two pairs
 * there moves the corpus from 610 to 612, which three documents quote. Two of
 * those quotes are a VERBATIM `compare:impls` run (`corpus_pairs=610`,
 * `html: compared=610 diffs=0 ...`), and hand-editing a quoted tool output to
 * match a run nobody performed is worse than leaving the rule unpinned. So the
 * corpus keeps the case it already has for the basic shape
 * (`24-generic-divs-2`), and the part that was unpinned - the width behavior -
 * is pinned here against the same engine the rest of this suite measures.
 *
 * The interruption row is included as a CONTROL. Without it, "these all come out
 * as one paragraph" would also pass if `:::` had stopped interrupting paragraphs
 * altogether, which is a different and much larger bug.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToHtml } from '@markup-carve/carve'

const collapse = (html) => html.replace(/\s+/g, ' ').trim()

test('a bare ::: still interrupts an open paragraph', () => {
  // The control. §10, and the row the malformed cases are measured against.
  assert.equal(
    collapse(carveToHtml('text\nnot a div\n:::\n')),
    '<p>text not a div</p> <div> </div>',
  )
})

test('a malformed opener makes the paragraph absorb the closing fence', () => {
  // `::: {.x}` is not an opener - the fence takes a type word, not an attribute
  // block - so it is paragraph text, and the `:::` below it no longer interrupts.
  assert.equal(
    collapse(carveToHtml('::: {.x}\nnot a div\n:::\n')),
    '<p>::: {.x} not a div :::</p>',
  )
})

test('the malformed line need not be the paragraph first line', () => {
  assert.equal(
    collapse(carveToHtml('a\n::: {.x}\nnot a div\n:::\n')),
    '<p>a ::: {.x} not a div :::</p>',
  )
})

test('the absorption is not width-tagged', () => {
  // The half nothing pinned, and the surprising one: the closer rule it
  // resembles matches on EXACT length, this does not compare widths at all. A
  // malformed opener has no length for a closer to match.
  assert.equal(
    collapse(carveToHtml('::: {.x}\nnot a div\n::::\n')),
    '<p>::: {.x} not a div ::::</p>',
    'a wider fence after a malformed opener was not absorbed',
  )
  assert.equal(
    collapse(carveToHtml(':::: {.x}\nnot a div\n:::\n')),
    '<p>:::: {.x} not a div :::</p>',
    'a narrower fence after a malformed opener was not absorbed',
  )
})

test('a valid opener is unaffected', () => {
  // The boundary. Every assertion above would also pass if the fence had stopped
  // opening blocks at all.
  assert.equal(
    collapse(carveToHtml('::: note\nbody\n:::\n')),
    '<aside class="admonition note"> <p>body</p> </aside>',
  )
})

test('a closer matches on EXACT length, not equal-or-greater', () => {
  // The other half of what carve#770 turned up: §12 said EQUAL-OR-GREATER and
  // said equal-length fences do not nest. Both contradicted the formal
  // `len(close) = len(open)` guard and all three engines. Pinned so the sentence
  // cannot drift back.
  //
  // A wider bare fence does not close a narrower block - it opens one.
  assert.equal(
    collapse(carveToHtml('::: note\nbody\n::::\n')),
    '<aside class="admonition note"> <p>body</p> <div> </div> </aside>',
  )
  // And equal-length fences DO nest, because a closer must be BARE: the inner
  // line carries a label, so it is an opener.
  assert.equal(
    collapse(carveToHtml('::: note\nouter\n::: tip\ninner\n:::\n:::\n')),
    '<aside class="admonition note"> <p>outer</p> ' +
      '<aside class="admonition tip"> <p>inner</p> </aside> </aside>',
  )
})
