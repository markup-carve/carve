/*
 * WHICH newlines a line block hardens, on the shapes the corpus cannot reach.
 *
 * markup-carve/carve#1282 rules that an inline run with no closer reaches the
 * end of its block, line block included, and that the break it swallows is
 * CONTENT rather than a `<br>`. The corpus pins that rule on the shapes an
 * author writes.
 *
 * This file pins the shapes that decide HOW it is implemented. The first
 * attempt hardened breaks by scanning the rendered HTML for `<code>` and the
 * math `<span>`, which reads the answer off the output instead of off the node
 * that matched the newline. Every case below is one that scan got wrong, and
 * every one of them renders identically to the ruled shape under the reading
 * that is correct - so the corpus, which only carries the ruled shape, would
 * have stayed green on all of them.
 *
 * They are here rather than in the corpus because none of them is ruled: the
 * question they answer is not "what does this document mean" but "is the
 * implementation reading provenance or guessing". A corpus pair would also
 * publish an expectation for a shape no engine has been measured on.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src))

test('an unclosed run keeps a preserved trailing gap', () => {
  // SS23 turns the two-column run into NBSP CONTENT before any whitespace rule
  // reaches it, and the run then carries that content. Feeding the gap into the
  // inline parser as no-break spaces is what makes the stanza one parse, so the
  // unclosed run's trailing-whitespace strip must not treat them as whitespace:
  // `\s` does, and the gap disappeared.
  assert.equal(
    render('::: |\na `b\nc  \n:::\n'),
    '<div class="line-block">\n  <p>a <code>b\nc  </code></p>\n</div>'.replace(
      / /g,
      '&nbsp;',
    ),
  )
})

test('a math span with an id before its class keeps the break as content', () => {
  // The base class sits at the FIRST-APPEARANCE position of a class, so an
  // authored id ahead of it puts `id` first in the tag. A scan looking for
  // `<span class="math` misses that span entirely and writes a `<br>` into the
  // math body.
  assert.equal(
    render('::: |\na $`x\nb`{#i .c}\nz\n:::\n'),
    '<div class="line-block">\n' +
      '  <p>a <span id="i" class="math inline c" role="math">\\(x\nb\\)</span><br>\nz</p>\n' +
      '</div>',
  )
})

test('a raw passthrough holding a tag does not swallow the next break', () => {
  // The payload is emitted verbatim, so a `<code>` inside it is text that looks
  // like an opening tag. Reading provenance, the break after it is still a
  // break; reading the output, everything downstream is inside a code span.
  const html = render('::: |\na `<code>`{=html} b\nc d\n:::\n')
  assert.match(html, /b<br>\nc d/)
})

test('an unclosed literal keeps the break as content', () => {
  // A literal renders with NO wrapper element when it carries no attributes,
  // so there is nothing in the output to tell a scan that the newline is
  // inside verbatim content. The node knows.
  assert.equal(
    render('::: |\na !`x\nc d\n:::\n'),
    '<div class="line-block">\n  <p>a x\nc d</p>\n</div>',
  )
})
