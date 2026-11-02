/*
 * A colon line is read on its own (carve#4863): a malformed opener is paragraph
 * text and leaves no state, so a bare run below it still interrupts the
 * paragraph, at any width. This replaced the absorption reading of carve#770.
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

test('a bare run below a malformed opener still interrupts the paragraph', () => {
  // `::: {.x}` is not an opener - the fence takes a type word, not an attribute
  // block - so it is paragraph text and leaves the `:::` below it unaffected.
  assert.equal(
    collapse(carveToHtml('::: {.x}\nnot a div\n:::\n')),
    '<p>::: {.x} not a div</p> <div> </div>',
  )
})

test('the malformed line need not be the paragraph first line', () => {
  assert.equal(
    collapse(carveToHtml('a\n::: {.x}\nnot a div\n:::\n')),
    '<p>a ::: {.x} not a div</p> <div> </div>',
  )
})

test('no width is compared against a malformed opener', () => {
  assert.equal(
    collapse(carveToHtml('::: {.x}\nnot a div\n::::\n')),
    '<p>::: {.x} not a div</p> <div> </div>',
  )
  assert.equal(
    collapse(carveToHtml(':::: {.x}\nnot a div\n:::\n')),
    '<p>:::: {.x} not a div</p> <div> </div>',
  )
})

test('a valid opener is unaffected', () => {
  // The boundary. Every assertion above would also pass if the fence had stopped
  // opening blocks at all.
  assert.equal(
    collapse(carveToHtml('::: note\nbody\n:::\n')),
    '<aside class="admonition note" aria-label="Note"> <p>body</p> </aside>',
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
    '<aside class="admonition note" aria-label="Note"> <p>body</p> <div> </div> </aside>',
  )
  // And equal-length fences DO nest, because a closer must be BARE: the inner
  // line carries a label, so it is an opener.
  assert.equal(
    collapse(carveToHtml('::: note\nouter\n::: tip\ninner\n:::\n:::\n')),
    '<aside class="admonition note" aria-label="Note"> <p>outer</p> ' +
      '<aside class="admonition tip" aria-label="Tip"> <p>inner</p> </aside> </aside>',
  )
})
