/*
 * The colon fence's canonical width costs bytes, and the number is a reading.
 *
 * PART 9 §12 records what widening a fence by one colon per level buys - an
 * O(1) writer that needs no subtree scan - and what it costs, which is
 * `d^2 + 5d` bytes of fence marker for a nest `d` containers deep. The clause
 * quotes that cost at the parse cap, off ONE corpus document, and
 * docs/divergence-from-djot.md §13 quotes the same figures for readers who
 * never open the grammar.
 *
 * Those figures are a reading at a pin, not an invariant (the shape PART 11 §2b
 * had to be corrected into at carve#1567). The document behind them is a corpus
 * fixture: renumber it, regenerate it, or move MAX_NESTING_DEPTH, and every
 * number in both places is quietly wrong while both pages still read as
 * measured. Nobody re-derives a byte count from prose.
 *
 * So this file derives them from the fixture and its `.fmt` sidecar, and makes
 * the two documents agree with the measurement rather than with each other. It
 * fails in both directions: edit a number in either page without re-measuring,
 * or move the corpus document out from under the number, and it goes red.
 *
 * What it deliberately does NOT pin is the ratio as a property of the language.
 * 21x is this rule's worst case, taken at a document written to sit at the cap;
 * the invariant is the formula, which is checked here in closed form against
 * the same bytes (carve#1553).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(repo, p), 'utf8')

const BASE = 'tests/corpus/182-openers-past-the-nesting-cap-are-one-paragraph'
const source = read(`${BASE}.crv`)
const canonical = read(`${BASE}.fmt`)

/** MAX_NESTING_DEPTH, PART 9 §25. The cap this document is written to sit at. */
const CAP = 200

const colons = (text) => (text.match(/:/g) ?? []).length
/** The colon run each line opens with, which for a fence line is its width. */
const fenceWidths = (text) =>
  text.split('\n').map((line) => (/^:*/.exec(line))[0].length)

test('PART 9 §12 quotes the canonical-form cost this corpus document measures', () => {
  const sourceBytes = Buffer.byteLength(source, 'utf8')
  const canonicalBytes = Buffer.byteLength(canonical, 'utf8')
  const fenceBytes = colons(canonical)
  const widest = Math.max(...fenceWidths(canonical))

  // The closed form, checked against the bytes rather than restated from them.
  // A nest `d` deep spells widths 3..d+2 on the openers and again on the
  // closers, so 2 * sum(3..d+2) = d^2 + 5d. The remainder is the three
  // over-cap openers, which degrade to paragraph text and keep the width the
  // author typed - they are the reason this document is in the corpus at all.
  const ladder = CAP * CAP + 5 * CAP
  const authored = fenceWidths(source).filter((w) => w > 0)
  const authoredWidth = authored[0]
  assert.ok(
    authored.every((w) => w === authoredWidth),
    'the source spells every opener at one width, which is what makes it a depth ladder',
  )
  const overCap = authored.length - CAP
  assert.ok(overCap > 0, 'the document reaches past the cap, which is what it is for')
  assert.equal(widest, CAP + 2, 'the widest fence is the cap plus the base run')
  assert.equal(
    fenceBytes,
    ladder + overCap * authoredWidth,
    'every colon in the canonical form is either the depth ladder or an over-cap opener',
  )

  const grammar = read('resources/grammar.ebnf')
  const page = read('docs/divergence-from-djot.md')
  const share = ((fenceBytes / canonicalBytes) * 100).toFixed(1)
  const ratio = (canonicalBytes / sourceBytes).toFixed(1)
  const grouped = (n) => n.toLocaleString('en-US')

  for (const [where, text] of [['PART 9 §12', grammar], ['divergence §13', page]]) {
    for (const claim of [grouped(sourceBytes), grouped(canonicalBytes), grouped(fenceBytes), `${share}%`, String(CAP), String(widest)]) {
      assert.ok(
        text.includes(claim),
        `${where} states the measured ${claim}; re-measure before editing the number`,
      )
    }
  }

  // The clause rounds the ratio one way and the page the other, on purpose:
  // one is the reading, the other is how a reader will quote it.
  assert.ok(grammar.includes(`${ratio}x`), `PART 9 §12 states the measured ${ratio}x expansion`)
  assert.ok(page.includes(`${Math.round(Number(ratio))}x`), 'the page states the rounded expansion')
})
