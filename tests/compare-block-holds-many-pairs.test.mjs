/*
 * A `::: compare` block holds as many pairs as its author wrote.
 *
 * It used to hold one. The fence that should have opened the second pair
 * overwrote the first, so the document was gone before generate-corpus.mjs
 * wrote anything: no fixture, no conformance run, and a corpus count one lower
 * than the source declares. Both reconcile checks in that script were counts of
 * the extraction compared against the extraction - one block opened, one pair
 * written, 1 === 1 - so neither could report it (carve#1373).
 *
 * The corpus source happens to have no multi-pair block today, which is why
 * nothing was ever lost from it. That makes this the only place the behavior is
 * pinned, so it is pinned on all three of its parts: the pairs come out, they
 * come out in order, and each one's documentation segment is a COMPLETE
 * container rather than half of the one it was cut from.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanExampleSource, numberExamples } from '../scripts/lib/example-sections.mjs'
import { censusComparePairs } from '../scripts/lib/example-pair-census.mjs'

const doc = (body) => body.split('\n')

const twoPairs = doc(`## Two pairs in one block

::: compare

\`\`\`carve
first
\`\`\`

\`\`\`html
<p>first</p>
\`\`\`

\`\`\`carve
second
\`\`\`

\`\`\`html
<p>second</p>
\`\`\`

:::
`)

const onePair = doc(`## One pair

::: compare

\`\`\`carve
only
\`\`\`

\`\`\`html
<p>only</p>
\`\`\`

:::
`)

test('every pair in a compare block is extracted, in source order', () => {
  const scan = scanExampleSource(twoPairs)
  assert.equal(scan.examples.length, 2)
  assert.deepEqual(scan.examples.map((ex) => ex.carve), ['first', 'second'])
  assert.deepEqual(scan.examples.map((ex) => ex.html), ['<p>first</p>', '<p>second</p>'])
  assert.equal(scan.dropped.length, 0, scan.dropped.join('\n'))
})

test('the pairs of one block are numbered as one category', () => {
  const scan = scanExampleSource(twoPairs)
  numberExamples(scan)
  assert.deepEqual(
    scan.examples.map((ex) => ex.corpusName),
    ['01-two-pairs-in-one-block', '01-two-pairs-in-one-block-2'],
  )
})

test('each pair gets a complete compare container of its own', () => {
  // A page may route ONE fixture, and generate-example-pages.mjs then emits
  // that segment alone. Cutting a block between its pairs leaves the first
  // without a closer and the second without an opener, which is malformed
  // Markdown wherever it lands on its own.
  const scan = scanExampleSource(twoPairs)
  assert.equal(scan.sections[0].segments.length, 2)
  for (const segment of scan.sections[0].segments) {
    const markers = segment.bodyLines.filter((line) => /^:{3,}/.test(line.trim()))
    assert.equal(markers.length, 2, `segment is not a closed container:\n${segment.bodyLines.join('\n')}`)
    assert.match(markers[0], /^:{3,}\s+compare\b/)
    assert.equal(markers[1].trim(), ':::')
    assert.equal(segment.bodyLines.filter((line) => /^`{3,}carve\s*$/.test(line)).length, 1)
    assert.equal(segment.bodyLines.filter((line) => /^`{3,}html\s*$/.test(line)).length, 1)
  }
})

test('a single-pair block keeps the segment it always had', () => {
  // The fix must not move an existing boundary: every corpus category today is
  // a one-pair block, and a segment that grew a synthesized marker would change
  // 1245 generated documentation pages.
  const scan = scanExampleSource(onePair)
  const [segment] = scan.sections[0].segments
  assert.deepEqual(segment.bodyLines, onePair.slice(segment.startLine, segment.endLine))
})

test('the census counts the pairs the source declares, not the ones extracted', () => {
  // The census is what makes the reconcile in generate-corpus.mjs able to fail:
  // it reads the source through an implementation that shares no code with the
  // scanner, so a scanner that drops a pair disagrees with it.
  assert.deepEqual(censusComparePairs(twoPairs), [
    { line: 3, marker: ':::', carve: 2, html: 2 },
  ])
  assert.deepEqual(censusComparePairs(onePair), [
    { line: 3, marker: ':::', carve: 1, html: 1 },
  ])
})

test('the census does not read a fenced example body as markup', () => {
  // An example whose CONTENT is a fenced block is ordinary here - a ````carve
  // holding a ``` mermaid - and counting its inner fence would report a pair
  // the author never wrote.
  const nested = doc(`## Nested fences

::: compare

\`\`\`\`carve
\`\`\`carve
inner
\`\`\`
\`\`\`\`

\`\`\`\`html
<pre><code class="language-carve">inner
</code></pre>
\`\`\`\`

:::
`)
  assert.deepEqual(censusComparePairs(nested), [
    { line: 3, marker: ':::', carve: 1, html: 1 },
  ])
  assert.equal(scanExampleSource(nested).examples.length, 1)
})

test('the census reports a block that never closes', () => {
  const unclosed = doc(`## Unclosed

::: compare

\`\`\`carve
x
\`\`\`
`)
  assert.deepEqual(censusComparePairs(unclosed), [
    { line: 3, marker: ':::', carve: 1, html: 0, unclosed: true },
  ])
})
