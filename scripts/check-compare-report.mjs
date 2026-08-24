#!/usr/bin/env node
/*
 * The cross-implementation half of the compare-impls gate, applied to a report
 * file instead of to a second pass over the corpus.
 *
 * WHY THIS EXISTS. The `AST conformance` workflow ran compare-impls twice over
 * the same corpus with the same three engines: once with `--roundtrip
 * --fail-on-diff` and once with `--fail-on-diff`. That was 1214s + 669s, 83% of
 * a 38-minute job, and the second invocation was almost all repeated work -
 * `--roundtrip` is additive, so the first run already computed `crossImplDiffs`
 * and every engine's fixture `mismatch` count.
 *
 * What was NOT shared was the gate. compare-impls hands each mode a different
 * subset of the failing conditions: roundtrip mode gates round-trip diffs and
 * the PART 11 §1 invariants, default mode gates cross-engine diffs and fixture
 * mismatches, and each zeroes the other's counts. So deleting the second
 * invocation would have deleted the only gate on an engine disagreeing with a
 * FIXTURE - the check whose own comment in compare-impls records that it "could
 * not fail the job" until it was added, which is the defect class carve#755
 * catalogues. The saving had to come without dropping a condition.
 *
 * So: compute once, gate twice. The roundtrip run writes `--report=<file>` and
 * gates its own half; this reads the file and gates the other half. All six
 * conditions still fail the job, and the corpus is walked once.
 *
 * WHY IT STAYS A SEPARATE STEP. The workflow's verdict step reads back the
 * names of the FAILING STEPS from the jobs API and files them into a tracking
 * ticket. Collapsing the two steps into one would have made every failure
 * report the same name, so the ticket would no longer say whether the formatter
 * changed a document or the engines disagree about a render target. Keeping the
 * step boundary keeps `Cross-engine render comparison (all targets)` in the
 * ticket, and this script's own messages name the specific condition on top of
 * that. The wall clock, not the signal, is what gets removed.
 */
import { existsSync, readFileSync } from 'node:fs'

import { COMPARISON_TARGETS } from './lib/corpus-targets.mjs'

const path = process.argv[2]
if (!path) {
  console.error('Usage: node scripts/check-compare-report.mjs <report.json>')
  process.exit(2)
}

/*
 * A MISSING REPORT IS A FAILURE, not a pass.
 *
 * The step that writes this file runs first and can die before reaching the
 * write - an engine that will not build, a missing fixture, a crash. If absence
 * read as "nothing to report" this gate would go green precisely when the run
 * it depends on fell over, which is the shape of check that cannot fail.
 */
if (!existsSync(path)) {
  console.error(`No report at ${path}.`)
  console.error(
    'The step that produces it (compare:impls --roundtrip --fail-on-diff --report=...) did not ' +
      'get far enough to write it, so nothing cross-implementation was checked. Read that step, ' +
      'not this one.',
  )
  process.exit(1)
}

let report
try {
  report = JSON.parse(readFileSync(path, 'utf8'))
} catch (err) {
  console.error(`Could not parse ${path}: ${err.message}`)
  process.exit(1)
}

if (report.schema !== 1) {
  console.error(`Unknown report schema ${JSON.stringify(report.schema)} in ${path}; expected 1.`)
  process.exit(1)
}

/*
 * THE REPORT MUST COME FROM A FULL RUN.
 *
 * `--counts-only`, `--targets=` and `--limit=` all narrow what was compared,
 * and a narrowed run writes a report whose zeros are perfectly true about a
 * smaller question. Gating on one of those would quietly cover less than the
 * invocation this replaced while still going green, so each narrowing is
 * refused by name rather than averaged into a pass.
 */
const mode = report.mode ?? {}
const narrowed = []
if (mode.countsOnly) {
  narrowed.push('--counts-only rendered one target instead of every comparison target')
}
if (mode.corpus !== 'core') {
  narrowed.push(`the corpus was "${mode.corpus}", not "core"`)
}
if (mode.limit !== null && mode.limit !== undefined) {
  narrowed.push(`--limit=${mode.limit} compared part of the corpus`)
}
if (mode.shard && !/^\d+\/\d+$/.test(mode.shard)) {
  narrowed.push(`invalid shard metadata: ${mode.shard}`)
}
const missingTargets = COMPARISON_TARGETS.filter((t) => !(mode.targets ?? []).includes(t))
if (missingTargets.length > 0) {
  narrowed.push(`target(s) not compared: ${missingTargets.join(', ')}`)
}
// Two engines is the floor for any cross-engine claim; with one, the diff count
// is zero by construction. compare-impls already refuses this under
// `--fail-on-diff`, and this refuses it again because the report is now read by
// something that did not watch that run happen.
if ((mode.engines ?? []).length < 2) {
  narrowed.push(`only ${(mode.engines ?? []).length} engine(s) ran, so no comparison happened`)
}
if (narrowed.length > 0) {
  console.error(`${path} was written by a run that compared less than this gate covers:`)
  for (const reason of narrowed) console.error(`  - ${reason}`)
  console.error('Re-run compare:impls over the full core corpus and every target.')
  process.exit(1)
}

const crossImplDiffs = report.crossImplDiffs ?? 0
const mismatches = report.mismatches ?? 0

console.log(
  `Read ${path}: ${mode.engines.join(', ')} over the ${mode.corpus} corpus, ` +
    `targets ${mode.targets.join(', ')}.`,
)

if (crossImplDiffs > 0 || mismatches > 0) {
  if (crossImplDiffs > 0) {
    console.error(
      `\n${crossImplDiffs} cross-implementation difference(s) - see the DIFF lines in the ` +
        'compare step above.',
    )
  }
  if (mismatches > 0) {
    const by = Object.entries(report.mismatchedBy ?? {})
      .filter(([, count]) => count > 0)
      .map(([name, count]) => `${name}=${count}`)
      .join(' ')
    console.error(
      `${mismatches} case(s) where an engine disagrees with the expected output` +
        `${by ? ` (${by})` : ''} - see the per-engine mismatch counts in the compare step above.`,
    )
  }
  process.exit(1)
}

console.log('No cross-implementation differences and no fixture mismatches.')
