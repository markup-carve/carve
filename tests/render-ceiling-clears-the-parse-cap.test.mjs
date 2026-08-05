/*
 * PART 9 §25's render ceiling, pinned against the property it exists to
 * guarantee: a document AT the parse cap (MAX_NESTING_DEPTH) MUST render
 * whole, on every render target, not just HTML.
 *
 * "The ceiling exceeds MAX_NESTING_DEPTH by construction" held only when the
 * ceiling was derived in the SAME unit the renderer counts depth in. Two
 * engines count container depth (one step per nesting level, matching
 * MAX_NESTING_DEPTH's own unit); a third counted AST node levels, where a
 * list level costs TWO node levels (`list`, then `list_item`) before its
 * body. That engine restated the container-depth engine's fixed offset
 * (MAX_NESTING_DEPTH + 32) as its own margin, which is a 1.16x multiple in
 * container-depth terms but under a 1x multiple of what an AST-node count
 * needed - so an ordinary 120-level list ladder, well inside the parse cap
 * of 200, reached that engine's render ceiling and silently dropped the
 * innermost content (carve#650).
 *
 * This engine (carve-js) counts container depth, so it was never subject to
 * that specific bug - but the PROPERTY the fixed engine now satisfies is
 * general: no tree `parse` produces at or under MAX_NESTING_DEPTH should
 * ever reach a render ceiling, on ANY target. That is the check the spec
 * asks for and no corpus fixture could carry it (see the size argument in
 * tests/nesting-cap-degrade.test.mjs), so it is pinned here the same way.
 *
 * BLOCKQUOTE nesting, not list nesting, builds the fixture. §25 applies
 * MAX_NESTING_DEPTH uniformly across blockquote, list, and fenced-div /
 * admonition containers, so blockquote depth is an equally valid witness of
 * "at the parse cap" - and unlike list nesting, it does not trip a separate,
 * unrelated performance cliff in this engine's Markdown renderer (list
 * nesting past roughly depth 50 does not return in any practical time here;
 * that is worth its own report, but it is not this ticket's defect).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  carveToAnsi,
  carveToCarve,
  carveToHtml,
  carveToMarkdown,
  carveToPlainText,
} from '@markup-carve/carve'

// The parser cap is 200 in every engine (PART 9 §25).
const MAX_NESTING_DEPTH = 200
const MARKER = 'RENDER-CEILING-LEAF-MARKER'

// `> ` repeated to the cap, one blockquote level per repetition, with a
// unique leaf so truncation (as opposed to merely large output) is
// detectable.
const atTheParseCap = () => '> '.repeat(MAX_NESTING_DEPTH) + MARKER + '\n'

const renderers = {
  renderHtml: carveToHtml,
  renderMarkdown: carveToMarkdown,
  renderCarve: carveToCarve,
  renderPlainText: carveToPlainText,
  renderAnsi: carveToAnsi,
}

for (const [name, render] of Object.entries(renderers)) {
  test(`${name}: a document at MAX_NESTING_DEPTH renders whole, not truncated`, () => {
    const out = render(atTheParseCap())
    assert.ok(
      out.includes(MARKER),
      `${name} dropped the innermost content of a document at the parse cap`,
    )
  })
}
