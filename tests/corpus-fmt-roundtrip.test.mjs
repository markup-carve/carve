/*
 * The formatter preserves the document, over the WHOLE corpus.
 *
 * tests/corpus-roundtrip/ pins the canonical writer against eleven hand-written
 * documents, chosen for their escaping decisions and - since carve#787 - for
 * the ORDER the writer emits collected definitions in. That is the right shape for
 * pinning bytes, and it is a thin sample: the corpus has 500+ documents that
 * exercise every construct in the language, and none of them were ever put
 * through the writer.
 *
 * The cost of that gap is not hypothetical. carve-rs turns
 *
 *     > a
 *     >
 *     > %%%
 *     > x
 *     > %%%
 *
 * into source where the commented-out `x` renders as a visible paragraph
 * (carve-rs#432) - and the corpus ALREADY contains documents that expose it
 * (70-blocks-that-render-to-nothing and -3). They pass every gate, because the
 * HTML fixtures compare the FIRST render and nothing re-renders the formatter's
 * output. The documents were there; the property was not checked.
 *
 * Two properties, both from PART 11 §1:
 *
 *   toHtml(fmt(x)) == toHtml(x)   formatting does not change what the document
 *                                 says. This is the one that catches content
 *                                 disclosure - a writer bug that turns hidden
 *                                 text visible fails here and nowhere else.
 *
 *   fmt(fmt(x)) == fmt(x)         formatting settles. A writer that does not
 *                                 is worse than one that loses a field: every
 *                                 run produces a diff.
 *
 * This checks the REFERENCE engine only, because that is what this repo pins.
 * The same properties across the other engines are `compare:impls --roundtrip`,
 * which needs their checkouts and runs in the conformance workflow.
 *
 * DECLARED DRIFT. `resources/engine-pin-drift.txt` names corpus documents the
 * pinned build does not READ the way the corpus says (carve#533's mechanism,
 * consulted by `npm run engine:report -- --check` and by
 * corpus-fmt-cross-read.test.mjs); `resources/engine-fmt-drift.txt` is its
 * writer-side counterpart, for a document the pin reads fine but cannot WRITE
 * back out faithfully (see that file's own header for why the two stay
 * separate). This test previously had no escape valve of its own, so a spec
 * PR that put the corpus ahead of the pin (as carve#665/#666/#668 did for the
 * definition-list `dd` and `+`-attached shapes) failed here even for a slug
 * already declared for the cross-read check. Declared in either file means
 * excused here too, now.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToCarve, carveToHtml } from '@markup-carve/carve'
import { parse as parseSpec } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { loadDeclaredFmtDrift, loadWriterOnlyDrift } from './fmt-drift.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus')

/** The oracle's rendering, or the refusal it raised - both are answers to compare. */
const oracleHtml = (src) => {
  try {
    return renderDoc(parseSpec(src))
  } catch (err) {
    return `REFUSED: ${err.message}`
  }
}

const documents = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .sort()
  .map((f) => ({ slug: f.replace(/\.crv$/, ''), source: readFileSync(resolve(corpusDir, f), 'utf8') }))

const declaredDrift = loadDeclaredFmtDrift(here)

test('the corpus is non-empty, so a broken glob cannot pass as a clean run', () => {
  assert.ok(documents.length > 100, `found ${documents.length} corpus documents`)
})

// BYTE FOR BYTE, which is what the three engines running this same property
// do: carve-js `test/render-carve.test.ts`, carve-php
// `tests/TestCase/CarveFmtCorpusTest.php` and carve-rs `tests/render_carve.rs`
// all compare the two renders untrimmed. This sweep used to trim both sides,
// which made the reference gate the loosest of the four - the wrong way round
// for the one a spec PR runs before the engines see the change.
//
// What a trim cannot see is a writer that adds or drops whitespace at a
// DOCUMENT boundary, and the corpus already holds the document that exposes
// it: `372-an-all-blank-raw-payload-still-emits-its-line` renders HTML that
// STARTS with two newlines, so a writer that ate the blank payload line - the
// exact rule that document exists to pin - changed what the document says and
// this sweep passed.
//
// The predicate is spelled a second time in the staleness ratchet below, and
// the two have to stay identical: strict here and trimmed there means a
// document excused here is reported there as an excuse that no longer applies.
test('formatting never changes what a corpus document says', () => {
  const changed = []
  for (const { slug, source } of documents) {
    const formatted = carveToCarve(source)
    if (carveToHtml(formatted) !== carveToHtml(source)) changed.push(slug)
  }
  const undeclared = changed.filter((slug) => !declaredDrift.has(slug))
  assert.deepEqual(
    undeclared,
    [],
    `these documents render differently after formatting, and resources/engine-pin-drift.txt ` +
      `does not excuse it - the writer changed the document, not just its spelling:\n  ${undeclared.join('\n  ')}`,
  )
})

// The declared-drift excuse applies here for the same reason it applies to the
// sweep above: a writer that changes what a document SAYS has no reason to
// settle on the next pass either, so the two failures are one defect reported
// twice. This sweep was the only one of the three that did not consult the
// files, which nothing noticed while `engine-fmt-drift.txt` was empty.
test('formatting a corpus document settles on the first pass', () => {
  const unsettled = []
  for (const { slug, source } of documents) {
    const once = carveToCarve(source)
    if (carveToCarve(once) !== once) unsettled.push(slug)
  }
  const undeclared = unsettled.filter((slug) => !declaredDrift.has(slug))
  assert.deepEqual(
    undeclared,
    [],
    `formatting these twice differs from formatting once, so every run produces a diff:\n  ` +
      undeclared.join('\n  '),
  )
})

// THE RATCHET ON THE EXCUSE ITSELF. Every other declared-drift file in this
// repo is checked in both directions; this one was checked in neither, because
// a slug in it can only ever turn a failure into a pass. So a line that the
// next pin bump makes untrue would keep excusing a document that no longer
// needs excusing, and the first person to notice would be whoever eventually
// removed it by hand.
test('every writer-drift line still names a document the pin writes wrongly', () => {
  const declared = loadWriterOnlyDrift(here)
  const byslug = new Map(documents.map((d) => [d.slug, d.source]))
  const stale = []
  for (const slug of declared) {
    const source = byslug.get(slug)
    // A slug naming no corpus document is stale in the strongest sense: the
    // fixture was renamed or removed and the line outlived it.
    if (source === undefined) {
      stale.push(`${slug} (no such corpus document)`)
      continue
    }
    const once = carveToCarve(source)
    // Untrimmed, and the same predicate as the sweep above by construction.
    const changesMeaning = carveToHtml(once) !== carveToHtml(source)
    const unsettled = carveToCarve(once) !== once
    // "CANNOT READ IT BACK THE SAME WAY" HAS TWO READERS, and the pin is only
    // one of them. corpus-fmt-cross-read.test.mjs consults this same file to
    // excuse the ORACLE reading a different document out of the pin's output,
    // so a line excusing exactly that was reported stale here while it was the
    // only thing keeping the other gate green (carve#1450). The reader that
    // matters for a corpus document is the one the corpus states, which is the
    // oracle; the pin's own reading is the second, not the only, way to be
    // wrong.
    const oracleChanges = oracleHtml(once) !== oracleHtml(source)
    // A THIRD WAY TO BE WRONG IS TO WRITE THE WRONG BYTES, and it was missing
    // here while the `.fmt` sweep below already consulted this file. Those two
    // halves contradicted each other: a spec PR that pins a canonical form the
    // pin does not emit declares the slug, the sweep honors the declaration -
    // and this ratchet then calls the line stale, because a document whose two
    // spellings render the same HTML and re-parse to the same tree round-trips
    // clean by all three signals above. The escape valve the comment below
    // describes could not actually be used (carve#1507).
    const fixture = resolve(corpusDir, `${slug}.fmt`)
    const fmtBytesDiffer = existsSync(fixture) && once !== readFileSync(fixture, 'utf8')
    if (!changesMeaning && !unsettled && !oracleChanges && !fmtBytesDiffer) stale.push(`${slug} (round-trips clean)`)
  }
  assert.deepEqual(
    stale,
    [],
    'resources/engine-fmt-drift.txt declares drift that no longer happens - ' +
      `delete the line in the commit that moves the pin past it:\n  ${stale.join('\n  ')}`,
  )
})

/*
 * The two sweeps above assert PROPERTIES, and every canonical-writer divergence
 * found so far satisfies both of them: a comment renders nothing, so a body at
 * the wrong column keeps `to_html(fmt(x)) == to_html(x)`, and a writer is
 * happily idempotent about a spelling it picked itself. The bytes are the only
 * thing that separates one canonical form from two.
 *
 * `.fmt` files existed for that and were read by nothing (carve#671). This
 * reads them for the pinned carve-js build; the engines need the same check
 * against their own writers, which is the other half of that issue.
 *
 * That other half is now `scripts/fmt-fixture-claims.mjs` (carve#841), which
 * runs the same fixtures against carve-js, carve-rs and carve-php and gates in
 * the conformance workflow, where the sibling checkouts are provisioned. Both
 * are wanted: this one runs on every PR against the build this repo pins, that
 * one cannot run per-PR and is the only thing that can see a writer defect
 * sparing carve-js. A new fixture belongs to both, and adding it here is enough
 * - that checker globs the same directory.
 */
const pinned = documents
  .map(({ slug, source }) => {
    const path = resolve(corpusDir, `${slug}.fmt`)
    return existsSync(path) ? { slug, source, expected: readFileSync(path, 'utf8') } : null
  })
  .filter(Boolean)

test('a .fmt fixture is read, so it can fail', () => {
  // Guards the sweep below against a glob that quietly matches nothing - the
  // failure mode the fixtures were already in.
  assert.ok(pinned.length >= 5, `found ${pinned.length} .fmt fixtures`)
})

// THE DECLARED-DRIFT EXCUSE REACHES HERE TOO, and this sweep was the last of
// the four in this file that did not consult it. The gap made the `.fmt`
// fixtures unusable for the one job they are best at: naming the canonical form
// BEFORE the engines reach it. A spec PR that rules on the writer could pin the
// bytes only by leaving the suite red, so it did not pin them at all, and three
// engines went on emitting three different strings with nothing saying which was
// right (carve#1334, where they emitted `a \`, `a ` and `a` for one document).
//
// A slug here is excused for the SAME reason as above and under the SAME
// ratchet: the staleness check below already fails the moment the pin stops
// drifting on it, so an excuse cannot outlive its cause.
test('fmt(x) matches every .fmt fixture (PART 11 §2)', () => {
  const wrong = []
  for (const { slug, source, expected } of pinned) {
    if (declaredDrift.has(slug)) continue
    const actual = carveToCarve(source)
    if (actual !== expected) wrong.push(`${slug}\n    expected: ${JSON.stringify(expected)}\n      actual: ${JSON.stringify(actual)}`)
  }
  assert.deepEqual(wrong, [], `the writer disagrees with its pinned canonical form:\n  ${wrong.join('\n  ')}`)
})

// A .fmt fixture the pin cannot produce still has to be a FAITHFUL
// serialization, or the drift line above pins a corruption as the target. The
// oracle is what checks it, because the engine is by definition the thing that
// cannot write these bytes yet: it re-reads the fixture and the case input and
// requires the same rendering out of both.
test('every drifting .fmt fixture still says what its case input says', () => {
  const wrong = []
  for (const { slug, source, expected } of pinned) {
    if (!declaredDrift.has(slug)) continue
    // Untrimmed too: a fixture that drops a boundary blank line is exactly the
    // unfaithful serialization this check exists to catch.
    if (renderDoc(parseSpec(expected)) !== renderDoc(parseSpec(source))) wrong.push(slug)
  }
  assert.deepEqual(
    wrong,
    [],
    `these .fmt fixtures are not faithful serializations of their case input:\n  ${wrong.join('\n  ')}`,
  )
})
