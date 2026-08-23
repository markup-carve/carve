import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml, mathBlock, codeGroup, wikilinks, headingPermalinks, externalLinks, colorSwatch, headingNumbers, headingLevelShift, tableOfContents, glossary, index } from '@markup-carve/carve'
import { scanExampleSource } from '../scripts/lib/example-sections.mjs'
import { deadLedgerKeys, tier3Verdict } from '../scripts/lib/tier3-ledger.mjs'
import { miscount } from '../scripts/spec/participants.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
/*
 * One factory per section. Tier-3 is never corpus-pinned, so a hand-written
 * example here has no other verifier - rendering each section through ONLY its
 * own extension is what stops these from becoming decorative HTML nobody runs.
 */
const factories = new Map([
  ['MathBlock', mathBlock], ['CodeGroup', codeGroup], ['Wikilinks', wikilinks],
  ['HeadingPermalinks', headingPermalinks], ['ExternalLinks', externalLinks],
  ['ColorSwatch', colorSwatch], ['HeadingNumbers', headingNumbers],
  ['HeadingLevelShift', headingLevelShift], ['TableOfContents', tableOfContents],
  ['Glossary', glossary], ['Index', index],
])

/*
 * Sections whose ` ```html ` fence states what the SPEC states and the PINNED
 * build has not shipped, keyed by section title.
 *
 * There is no committed golden here - the fence IS the expectation and it is
 * compared live - so without this ledger the only way to land a Tier-3 ruling
 * was to leave the fence recording the pre-ruling output, green, until a bump
 * turned it into an unreadable diff. `scripts/lib/tier3-ledger.mjs` carries the
 * reasoning; `resources/engine-pin-drift.txt` is the same window for the core
 * corpus and `AHEAD_OF_PIN` in `tests/optional-corpus.test.mjs` for Tier-2.
 *
 * An entry is DELETED in the commit that moves the pin past it: the check below
 * fails an entry whose example the build already reproduces, so a stale one
 * cannot sit here being read as coverage.
 *
 * `pinned` spells the gap the ruling opened - each pair is a fragment of the
 * fence and what the build writes there instead - so the declared section is
 * still compared EXACTLY, against the output the entry claims, and an unrelated
 * change in it cannot hide inside the declaration.
 */
const AHEAD_OF_PIN = {
  CodeGroup: {
    reason:
      "carve#1489 Extensions §13.2 - a css-mode panel carries its tab's name, and " +
      "code-group panels take the same treatment keyed on the panel's own label; the " +
      'pinned build names the wrapper only and leaves every panel anonymous',
    pinned: [
      ['<div class="code-group-panel" role="group" aria-label="JavaScript">', '<div class="code-group-panel">'],
      ['<div class="code-group-panel" role="group" aria-label="Python">', '<div class="code-group-panel">'],
    ],
  },
}

const scan = scanExampleSource(readFileSync(resolve(__dirname, '../resources/examples-tier3.md'), 'utf8').split('\n'))

assert.equal(scan.dropped.length, 0, scan.dropped.join('\n'))
assert.equal(scan.examples.length, factories.size, 'every Tier-3 section must contain one complete compare block')

test('every ledger entry names a section that exists', () => {
  const dead = deadLedgerKeys(Object.keys(AHEAD_OF_PIN), scan.examples.map((example) => example.section))
  assert.deepEqual(
    dead,
    [],
    `AHEAD_OF_PIN declares ${dead.join(', ')}, which no section in resources/examples-tier3.md ` +
      'is called. An entry that reaches nothing declares nothing: its section is compared as if ' +
      'undeclared, and the entry cannot be deleted by a bump because no check ever consults it.',
  )
})

/*
 * Counted where the verdict is REACHED, inside the test body, not where the
 * loop iterates.
 *
 * A counter incremented beside `test(...)` counts registrations, and a total of
 * registrations reconciled against the population that produced them is an
 * identity that holds before a single comparison runs - the carve#755 shape
 * this repo has now found a dozen times, and it is worth naming that the first
 * draft of THIS file had it. The numbers below say how many sections a run got
 * an answer for, and how many of the ledger's entries that run actually
 * consulted, neither of which the loop can guarantee on its own.
 */
const declared = Object.keys(AHEAD_OF_PIN).length
let verdicts = 0
let consulted = 0
for (const example of scan.examples) {
  const entry = AHEAD_OF_PIN[example.section]
  const label = entry
    ? `Tier-3 ${example.section} example is ahead of the pinned build`
    : `Tier-3 ${example.section} example matches carve-js`
  test(label, () => {
    const factory = factories.get(example.section)
    assert.ok(factory, `${example.section} has no single-extension verifier`)
    const finding = tier3Verdict({
      section: example.section,
      rendered: carveToHtml(example.carve, { extensions: [factory()] }),
      expected: example.html,
      entry,
    })
    // Before the assertion, so a section that reached a verdict and disagreed
    // reports the disagreement alone rather than also as a missing count.
    verdicts++
    if (entry) consulted++
    assert.equal(finding, null, finding ?? '')
  })
}

test('every section reached a verdict, and every ledger entry was consulted', () => {
  const unanswered = miscount({
    label: 'TIER-3',
    actual: verdicts,
    expected: factories.size,
    of: 'section(s) that reached a verdict',
  })
  assert.equal(unanswered, null, unanswered ?? '')

  // The ledger's own participation. `deadLedgerKeys` above catches an entry
  // that names nothing; this catches the other way an entry can go unread - a
  // loop that stopped consulting the ledger at all still names its sections and
  // compares every one of them, silently, exactly as before carve#1512.
  const unread = miscount({
    label: 'TIER-3 LEDGER',
    actual: consulted,
    expected: declared,
    of: 'declared entr(ies) the run consulted',
  })
  assert.equal(unread, null, unread ?? '')
})
