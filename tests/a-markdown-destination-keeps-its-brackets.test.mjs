/*
 * carve#2865. A Carve link destination holds a square bracket literally:
 * docs/dismissed-syntax.md is normative that a destination has no escape
 * processing, and records as a security invariant that the angle form
 * guarantees display text equal to destination. carve#2854 ruled the
 * percent-encoding out of the DJOT importer on exactly that reading
 * (carve-js#2685, carve-php#3045, both merged). The MARKDOWN importer still
 * does it, so the same bracket comes back as `%5B` / `%5D`.
 *
 * WHY THIS IS A ROUND TRIP AND NOT A CORPUS ROW. Category 551 already pins
 * the parse and render halves, where every reader agrees. What is lost here is
 * only visible across the writer and the importer together: the Markdown this
 * target writes is already correct, and the bracket is destroyed on the way
 * back in. Five of category 551's six documents fail the render/import round
 * trip for this one reason, which is why `renderImportRoundTrips.markdown` in
 * resources/import-roundtrip-baseline.json did not move when 551 landed.
 *
 * THE SIXTH DOCUMENT IS NOT THIS DEFECT and is asserted separately below.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToMarkdown, migrateMarkdown, carveToCarve, carveToHtml } from '@markup-carve/carve'

// Declared lag against the `@markup-carve/carve` build package.json pins.
// EMPTY IS THE GOAL: it goes out in the commit that moves the pin past the
// first engine to stop encoding a bracket on the Markdown side, and the five
// documents then join `renderImportRoundTrips.markdown` (markup-carve/carve#2865).
const PIN_LAG = 'carve#2865  the Markdown importer still percent-encodes a bracket in a destination'

// Category 551's five documents whose Markdown round trip this breaks, with
// the destination each one must come back with.
const DESTINATIONS = [
  ['[x](http://u/])\n', 'http://u/]'],
  ['[x](http://u/[)\n', 'http://u/['],
  ['[x](http://u/[a])\n', 'http://u/[a]'],
  ['![x](http://u/[a])\n', 'http://u/[a]'],
  ['[x](http://u/] "t]")\n', 'http://u/]'],
]

test('the writer is already right: a destination bracket is written literally', () => {
  // NOT guarded by the declaration. The writer half holds on every build, and
  // it is what makes the import the only place left to fix.
  for (const [carve] of DESTINATIONS) {
    assert.equal(carveToMarkdown(carve), carve, 'the Markdown target rewrote a destination')
  }
})

for (const [carve, destination] of DESTINATIONS) {
  test(`the Markdown round trip keeps ${destination}`, () => {
    const markdown = carveToMarkdown(carve)
    if (PIN_LAG) {
      // THE LIVE DETECTOR IS THE ENCODING ITSELF, so this cannot pass forever.
      // "The round trip does not return the document" would also be satisfied
      // by an engine that broke it some other way; naming the `%5B` / `%5D`
      // the encoding produces means the first engine to stop producing one
      // fails here and takes the declaration with it.
      const back = migrateMarkdown(markdown).value
      assert.match(
        back,
        /%5B|%5D/,
        `pin lag is declared and the bracket is no longer encoded - delete PIN_LAG: ${PIN_LAG}`,
      )
      return
    }
    assert.equal(migrateMarkdown(markdown).value, carve)
  })
}

test('the encoded destination is a rendered loss, not a spelling', () => {
  // WHY IT IS A BUG AND NOT A PREFERENCE, asserted rather than argued, and
  // live on every build: the href a reader follows changes. This is what
  // separates these five from the sixth document below.
  for (const [carve] of DESTINATIONS) {
    const back = migrateMarkdown(carveToMarkdown(carve)).value
    assert.notEqual(
      carveToHtml(back).trim(),
      carveToHtml(carve).trim(),
      'the round trip is byte-unequal but renders the same, so it belongs with the sixth document',
    )
  }
})

test("the sixth document differs on bytes alone, and which spelling is canonical is open", () => {
  // `a [b [x](u) c]` is category 551's control, and it fails the round trip
  // for an unrelated and milder reason (carve#2865). The writer escapes the
  // literal closing bracket, because an unescaped `[b ... c]` is a shortcut
  // reference label in Markdown, and the importer keeps the escape, because
  // `\]` is a literal `]` in Carve too. Nothing is lost: the two spellings
  // render identically.
  const carve = 'a [b [x](u) c]\n'
  const markdown = carveToMarkdown(carve)
  assert.equal(markdown, 'a [b [x](u) c\\]\n', 'the writer stopped escaping the bracket')
  const back = migrateMarkdown(markdown).value
  assert.equal(back, markdown, 'the importer stopped keeping the escape')
  assert.equal(carveToHtml(back).trim(), carveToHtml(carve).trim(), 'the escape changed the rendering')

  // AND BOTH SPELLINGS ARE CANONICAL FIXED POINTS, which is the measurement
  // that makes this a question rather than a fix: the canonical writer does
  // not normalize the unnecessary escape away, so the round trip cannot close
  // on either side without a ruling on which spelling is canonical.
  assert.equal(carveToCarve(carve), carve)
  assert.equal(carveToCarve(back), back)
  assert.notEqual(carveToCarve(back), carveToCarve(carve))
})
