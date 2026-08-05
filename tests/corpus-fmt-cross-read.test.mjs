/*
 * The formatter's output must say the same thing to a DIFFERENT reader.
 *
 * `corpus-fmt-roundtrip` already asserts `toHtml(fmt(x)) == toHtml(x)` over the
 * whole corpus - but it runs the pinned engine as both the writer and the reader.
 * Self-consistency is all that measures: an engine whose writer emits a form only
 * its own parser accepts passes, and nothing in this repo can say otherwise.
 *
 * That is not hypothetical. It is how three separate defects stayed green:
 *
 *   - all three engines wrote a footnote body at THREE spaces. carve-js reads
 *     blocks there, so its round trip passed; the oracle, carve-rs and carve-php
 *     read the body's table back as a paragraph (carve#709).
 *   - `fmt` stripped the padding from a lone `<` in a table, turning an
 *     unambiguous colspan into a cell the oracle reads as an alignment marker
 *     (carve-js#686).
 *   - the oracle required a space after a glued cell attribute block, so
 *     `|{.hl}Total |` - which every engine writes - rendered its braces as text
 *     (carve#713).
 *
 * So this asserts the property ACROSS the two implementations in this repo: take
 * the engine's `fmt` output and read it back with the ORACLE.
 *
 *   oracleHtml(engineFmt(x)) == oracleHtml(x)
 *
 * It is a strictly stronger claim than the round trip, and it is the check that
 * would have caught all three above. It could not be added until the pin carried
 * both engine fixes - with the previous pin it failed on 11 documents (carve#710).
 *
 * NOTE ON WHAT THIS DOES *NOT* COVER: carve-rs and carve-php are not here, because
 * this repo has no checkout of them. `compare:impls --roundtrip` is where that
 * lives, and it needs their sources. This closes the gap for the one engine whose
 * build is already a dependency.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToCarve } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { loadDeclaredFmtDrift } from './fmt-drift.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus')

const documents = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .sort()
  .map((f) => ({ slug: f.replace(/\.crv$/, ''), source: readFileSync(resolve(corpusDir, f), 'utf8') }))

// resources/engine-pin-drift.txt names documents the PINNED carve-js build is
// already known to read differently from the corpus (carve#533's declared-drift
// mechanism, consulted by `npm run engine:report -- --check`). If the pin
// disagrees on what a document MEANS in the first place, it necessarily
// disagrees on what to write back for it too - a cross-read divergence on one
// of these slugs is the same known gap surfacing through `carveToCarve`
// instead of through direct rendering, not a second, independent formatter
// defect. resources/engine-fmt-drift.txt adds the other direction: a document
// the pin reads correctly but whose writer output it cannot read back the
// same way (see that file's header). Declared in either file means excused
// here, same as everywhere else that consults them.
const declaredDrift = loadDeclaredFmtDrift(here)

/** The oracle's rendering, or the refusal it raised - both are answers to compare. */
const oracleHtml = (src) => {
  try {
    return renderDoc(parse(src))
  } catch (err) {
    return `REFUSED: ${err.message}`
  }
}

test('the corpus is non-empty, so a broken glob cannot pass as a clean run', () => {
  assert.ok(documents.length > 100, `found ${documents.length} corpus documents`)
})

test("the oracle reads the engine's formatted output as the same document", () => {
  const changed = []
  const skipped = []
  for (const { slug, source } of documents) {
    let formatted
    try {
      formatted = carveToCarve(source)
    } catch (err) {
      // The engine declining to format is a different property - the round-trip
      // test owns it. Recorded rather than silently passed over, so a sweep that
      // formats nothing cannot read as a clean run.
      skipped.push(`${slug}: ${err.message}`)
      continue
    }
    if (oracleHtml(formatted) !== oracleHtml(source)) changed.push(slug)
  }
  assert.deepEqual(skipped, [], 'the engine refused to format a corpus document')
  const undeclared = changed.filter((slug) => !declaredDrift.has(slug))
  assert.deepEqual(
    undeclared,
    [],
    'the oracle reads a different document out of the formatted source, ' +
      'and resources/engine-pin-drift.txt does not excuse it',
  )
})

test('the check can actually fail', () => {
  // A gate that sweeps 600 documents and reports nothing is indistinguishable
  // from one whose comparison is broken, so prove the comparison discriminates.
  // `^ cap` written with an escaped caret is a caption to neither reader, and a
  // three-space footnote body is the shape carve#709 was about.
  const captioned = '![a](/p.png)\n^ cap\n'
  assert.notEqual(
    oracleHtml('![a](/p.png)\n\\^ cap\n'),
    oracleHtml(captioned),
    'the oracle cannot tell a caption from an escaped caret',
  )

  const bodyAtTwo = '[^a]: intro\n\n  | a |\n  | - |\n  | b |\n\nsee[^a]\n'
  const bodyAtThree = '[^a]: intro\n\n   | a |\n   | - |\n   | b |\n\nsee[^a]\n'
  assert.notEqual(
    oracleHtml(bodyAtThree),
    oracleHtml(bodyAtTwo),
    'the oracle cannot tell a footnote body at three from one at two',
  )
})
