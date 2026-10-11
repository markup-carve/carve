/*
 * carve#2865: destination brackets survive Markdown export and import.
 * Category 551 pins parsing and rendering; these cases exercise the bridge.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToMarkdown, migrateMarkdown, carveToCarve, carveToHtml } from '@markup-carve/carve'

// Category 551's five bracket destinations must survive the Markdown bridge.
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
    assert.equal(migrateMarkdown(markdown).value, carve)
  })
}

test('the Markdown round trip preserves destination rendering', () => {
  for (const [carve] of DESTINATIONS) {
    const back = migrateMarkdown(carveToMarkdown(carve)).value
    assert.equal(
      carveToHtml(back).trim(),
      carveToHtml(carve).trim(),
      'Markdown import changed the rendered destination',
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
