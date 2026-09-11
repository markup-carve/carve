/*
 * A CANCELLED RUN IS EVIDENCE OF NOTHING, so it must not file a verdict.
 *
 * The `AST conformance` workflow builds four engines, runs on a schedule, and
 * files a ticket naming the gates that failed. Its concurrency group cancels an
 * older manual dispatch when a newer one arrives - which is the desired
 * behavior for the RUN and was the wrong behavior for the REPORT: under
 * `if: always()` the superseded run still reached the verdict step, read its own
 * interrupted jobs back through the cancelled-conclusion arm, and filed
 * "AST conformance is failing on main" (carve#1977). The dispatch that
 * superseded it was green on the SAME commit twelve minutes later, and closed
 * the ticket it had caused.
 *
 * The spurious ticket is the cheap half of that. The expensive half is the gate
 * union the verdict keeps: a red ticket's gate list is merged into the set a
 * later green run must execute before it may close the ticket (carve#1656). A
 * cancelled run contributes a TRUNCATED list of gates it happened to reach, so
 * the requirement can be widened by a run that measured nothing.
 *
 * Asserted on the workflow source rather than by running it, for the same
 * reason tests/ast-conformance-measures-before-it-gates.test.mjs is: this path
 * needs four engines built from their mains, so only a scheduled workflow ever
 * exercises it, which is exactly why the defect survived. Read as text, like
 * every other workflow assertion here, so the suite keeps no YAML dependency.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const workflow = readFileSync(
  resolve(here, '..', '.github/workflows/ast-conformance.yml'),
  'utf8',
)

/** The `if:` of the verdict step, read from the step's own block. */
const verdictCondition = () => {
  const lines = workflow.split('\n')
  const start = lines.findIndex((line) => /^\s*- name: File the verdict/.test(line))
  assert.notEqual(start, -1, 'the verdict step is gone, or was renamed away from this guard')
  assert.equal(
    lines.filter((line) => /^\s*- name: File the verdict/.test(line)).length,
    1,
    'more than one verdict step - this guard names one',
  )

  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*- name:/.test(lines[i])) break
    const condition = /^\s*if:\s*(.+?)\s*$/.exec(lines[i])
    if (condition) return condition[1]
  }

  return ''
}

test('the verdict step does not run on a cancelled run', () => {
  const condition = verdictCondition()
  assert.doesNotMatch(
    condition,
    /\balways\s*\(\s*\)/,
    'the verdict step runs under always(), so a run cancelled by the concurrency group ' +
      'files a ticket saying conformance failed and widens the gate set with the gates it ' +
      'never reached',
  )
  assert.match(
    condition,
    /!\s*cancelled\s*\(\s*\)|success\s*\(\s*\)\s*\|\|\s*failure\s*\(\s*\)/,
    'the verdict step must be guarded against cancellation, either with !cancelled() or ' +
      'with success() || failure()',
  )
})

test('the verdict step still runs when a gate fails', () => {
  // THE OVER-CORRECTION IS THE DANGEROUS ONE. Guarding with `success()` alone
  // also excludes cancellation and reads as a fix, and it stops every REAL
  // failure from being filed - the whole point of the step. A green-only
  // verdict is worse than no guard, because nothing goes red to say so.
  assert.notEqual(
    verdictCondition().replace(/\$\{\{|\}\}|\s/g, ''),
    'success()',
    'the verdict step would only run on green, so no failing gate would ever be filed',
  )
})

test('a superseded dispatch is what makes the guard load-bearing', () => {
  // The premise, recorded rather than assumed: without cancel-in-progress a
  // cancellation could only come from a person, and the guard would be
  // belt-and-braces. With it, the workflow cancels its own runs.
  const group = /^\s*cancel-in-progress:\s*(.+?)\s*$/m.exec(workflow)
  assert.ok(group, 'the concurrency group no longer sets cancel-in-progress')
  assert.match(
    group[1],
    /workflow_dispatch|true/,
    'the concurrency group no longer cancels a superseded dispatch - re-read the guard ' +
      'above and this test, one of them is now describing a workflow that changed',
  )
})
