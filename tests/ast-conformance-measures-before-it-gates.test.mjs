/*
 * A gate placed above a measurement deletes that measurement from every run the
 * gate fires on.
 *
 * `scripts/ast-conformance.mjs` already learned this once. The comment in it
 * beginning "PROVENANCE BEFORE THE GATE" records two roll-ups that sat below
 * the PART 12 §1a exit and therefore never printed on the runs whose numbers
 * most needed attributing.
 *
 * The binding-parity gate then did the same thing in a worse place. It lives
 * between the carve-rb block and the carve-php block, and on drift it called
 * `process.exit(1)` inline. carve-rb's pin going stale is, by that gate's own
 * comment, the usual case - so the usual case ended the process before
 * carve-php was measured at all, before the three-way panel ran, and before the
 * NOT MEASURED and STALE BUILDS roll-ups printed.
 *
 * The flag is what makes that sharp. CARVE_REQUIRE_ALL_ENGINES=1 exists so an
 * engine dropping out of the matrix is a red build rather than a line of prose
 * (carve#475), and under the early exit it was the flag that caused the drop.
 * Run 32409466637 is the evidence: carve-js, carve-rs and carve-rb each got a
 * section, carve-php got none, and no skip line said why. The 32 undeclared
 * carve-php span rows reported on carve#1451 were invisible to the workflow
 * that files carve#1451, for the whole time carve-rb's pin was behind.
 *
 * So this asserts the ORDER, which is the property that broke: between the
 * binding-parity verdict and the last engine's report there is no exit of any
 * kind. Asserted on the source rather than by running the script, because
 * running it needs four engines built from their mains - which is exactly why
 * this path is only ever exercised by a scheduled workflow, and exactly why the
 * defect survived.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const script = resolve(here, '../scripts/ast-conformance.mjs')
const source = readFileSync(script, 'utf8')

/** The two ends of the window, each a string that appears exactly once. */
const GATE = "A binding has no vote of its own"
const LAST_ENGINE_REPORT = "    'carve-php',\n"

function windowBetween() {
  const from = source.indexOf(GATE)
  assert.notEqual(from, -1, `the binding-parity verdict no longer says ${JSON.stringify(GATE)}`)
  const to = source.indexOf(LAST_ENGINE_REPORT, from)
  assert.notEqual(to, -1, 'the carve-php report no longer follows the binding-parity gate')
  return source.slice(from, to)
}

test('no gate exits between the binding-parity verdict and the last engine measured', () => {
  const between = windowBetween()
  assert.doesNotMatch(
    between,
    /process\.exit\(/,
    'an exit was put back between the binding-parity gate and the carve-php measurement.\n' +
      'Every run that gate fires on - the usual case, a stale carve-rb pin - now reports\n' +
      'three engines and says nothing about the fourth. Push onto `deferredGateFailures`\n' +
      'instead; it is drained at the bottom of the script, after every engine has reported.',
  )
})

test('the binding-parity gate still fails the run, just later', () => {
  const between = windowBetween()
  assert.match(
    between,
    /deferredGateFailures\.push\(/,
    'the binding-parity gate no longer records a failure at all. Deferring an exit and\n' +
      'dropping it look identical in a green run and are opposite in a red one.',
  )
  assert.match(
    between,
    /CARVE_REQUIRE_ALL_ENGINES/,
    'the gate stopped being conditional on the flag CI sets',
  )
})

test('every deferred gate failure is drained, and the drain exits non-zero', () => {
  const drain = source.slice(source.lastIndexOf('deferredGateFailures.length'))
  assert.ok(drain.length > 0, 'nothing ever reads `deferredGateFailures`, so the gate cannot fail')
  assert.match(
    drain,
    /process\.exit\(1\)/,
    'the drain does not exit, so a deferred gate failure would report itself and pass',
  )
})
