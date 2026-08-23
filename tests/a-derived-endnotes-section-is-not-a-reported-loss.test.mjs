/*
 * PART 9 §16a A DERIVED VALUE IS ONE THE IMPORTER CAN RECONSTRUCT, pinned on
 * the fixture's own bytes (markup-carve/carve-php#1588).
 *
 * WHY THIS EXISTS BESIDE THE FIXTURE. The same reason its sibling for
 * `derived-accessible-name` does: tests/html-import-contract.check.mjs runs
 * this fixture through the PINNED engine, and while that engine still reports
 * the endnotes wrapper as a loss the fixture sits under a declared PIN_LAG
 * entry. A lagging fixture is compared only for INEQUALITY, so its
 * expectations could be rewritten to say anything at all - including a blanket
 * "report nothing for a `<section>`", which the clause does not adopt - and the
 * contract check would stay green, because the engine disagrees with that too.
 *
 * THE ABSENCE OF A DIAGNOSTIC IS THE EASIEST THING TO ASSERT AND THE EASIEST TO
 * GET WRONG, so the input side is read too: this file fails if the fixture ever
 * stops carrying a shape that WOULD have been reported. An empty report over an
 * empty input proves nothing.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const fixture = new URL('./html-import/derived-endnotes-section/', import.meta.url)
const read = (name) => readFile(new URL(name, fixture), 'utf8')

test('the input carries the wrapper and both derived attributes', async () => {
  const html = await read('input.html')
  // The wrapper the renderer writes (PART 9 §16), which no Carve construct
  // spells - so unwrapping it takes nothing an author wrote.
  assert.match(html, /<section role="doc-endnotes"/)
  // The name is the `endnotes` labels key at its documented English default.
  assert.match(html, /aria-label="Footnotes"/)
  // AND NOTHING REFERENCES IT. That is the half the value-matched rule left
  // open: the renderer writes no section back for this document at all
  // (markup-carve/carve#1558), so an importer asking its own output whether the
  // role survived answers no, and calls a non-loss a loss.
  assert.doesNotMatch(html, /doc-noteref/)
})

test('the fixture states an empty report, and its source keeps every visible byte', async () => {
  const report = JSON.parse(await read('expected.report.json'))
  assert.deepEqual(report.diagnostics, [])
  const crv = await read('expected.crv')
  // The degraded form: the `<hr>` and the `<ol>` the section is built from.
  // Reported nothing AND lost nothing - the two claims have to hold together,
  // because silence over a document that lost its text is the worse defect.
  assert.equal(crv, '---\n\n1. Note text.\n')
})

test('the source and the AST carry neither derived attribute', async () => {
  for (const [what, text] of [
    ['expected.crv', await read('expected.crv')],
    ['expected.ast.json', await read('expected.ast.json')],
  ]) {
    assert.doesNotMatch(text, /doc-endnotes/, `${what} bakes the derived role into source`)
    assert.doesNotMatch(text, /Footnotes/, `${what} bakes the derived name into source`)
  }
})
