/*
 * PART 9 §25's degrade path, pinned.
 *
 * Past MAX_NESTING_DEPTH an opener stops recursing and becomes literal
 * paragraph text. How those lines GROUP was unstated, and the three engines
 * each chose differently - one paragraph per opener, one paragraph for all of
 * them with a trailing newline, and one without it (carve#494). All three
 * satisfied the clause as written; none matched another byte for byte.
 *
 * WHY THIS IS NOT A CORPUS CASE, which is what carve#494 asked for. The corpus
 * is GENERATED from the `::: compare` blocks in docs/examples/*.md, so a
 * fixture has to be a readable example on a page a human reads. Reaching the
 * cap takes 203 opener lines and produces 404 lines / 88 KB of expected HTML -
 * against a corpus whose largest existing case is 17 lines. The input cannot
 * be shortened either: the cap is 200, so no shorter document reaches the path
 * at all.
 *
 * So the shape is pinned here, generated from the cap rather than pasted, and
 * each engine pins it in its own suite (carve-js test/deep-nesting.test.ts,
 * carve-php tests/Parser/NestingCapTest.php). That is the coverage a corpus
 * case would have given, expressed per engine - what it does NOT give is
 * `compare:impls` running it, since that reads corpus directories. carve#494
 * is the record of that gap.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToHtml } from '@markup-carve/carve'

// The parser cap is 200 in every engine. Three past it is enough to show
// grouping: one line would not distinguish "one paragraph each" from "one
// paragraph for all".
const CAP = 200
const OVER_CAP = CAP + 3

const openers = (n) => ':::: note\n'.repeat(n)
const paragraphs = (html) => html.match(/<p>[\s\S]*?<\/p>/g) ?? []

test('consecutive over-cap openers and the text after them are ONE paragraph', () => {
  const html = carveToHtml(openers(OVER_CAP) + 'x\n')
  assert.deepEqual(paragraphs(html), ['<p>:::: note\n:::: note\n:::: note\nx</p>'])
})

test('there is no trailing newline before the closing tag', () => {
  const html = carveToHtml(openers(OVER_CAP))
  assert.deepEqual(paragraphs(html), ['<p>:::: note\n:::: note\n:::: note</p>'])
  assert.ok(!html.includes('\n</p>'), 'a newline before </p> is a byte no other paragraph emits')
})

test('the flattened paragraph ends at the first blank line, like any other', () => {
  const html = carveToHtml(openers(OVER_CAP) + '\ny\n')
  assert.deepEqual(paragraphs(html), [
    '<p>:::: note\n:::: note\n:::: note</p>',
    '<p>y</p>',
  ])
})

test('a heading past the cap is text too, and groups with the run', () => {
  const html = carveToHtml(openers(OVER_CAP) + '# h\n')
  assert.deepEqual(paragraphs(html), ['<p>:::: note\n:::: note\n:::: note\n# h</p>'])
})

// carve-rs#449 stopped one engine discarding these lines outright: output was
// byte-identical whether 5 or 7800 openers sat past the cap. Silent content
// loss does not announce itself in a shape assertion, so it gets its own.
test('every over-cap opener survives as text rather than being discarded', () => {
  const html = carveToHtml(openers(OVER_CAP) + 'x\n')
  assert.equal(
    (html.match(/note/g) ?? []).length,
    OVER_CAP,
    `${CAP} container titles plus ${OVER_CAP - CAP} flattened lines`,
  )
})

test('the containers below the cap are still real containers', () => {
  const html = carveToHtml(openers(OVER_CAP) + 'x\n')
  assert.equal((html.match(/<aside/g) ?? []).length, CAP)
})
