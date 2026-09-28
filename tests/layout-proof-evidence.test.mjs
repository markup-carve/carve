import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cases } from '../proofs/layout/cases.mjs'
import { compareReaders, generateChecks, validateProofSource, validateAssumptions } from '../scripts/layout-proof-check.mjs'

test('the ownership prototype reports both disagreements with its Part 0 model', () => {
  assert.deepEqual(compareReaders().map(f => f.name), [
    'post-blank-between-base-and-content',
    'comment-at-base',
  ])
})

test('the evidence check rejects an empty population', () => {
  assert.throws(() => compareReaders([]), /population/)
})

test('a changed reader result cannot pass as the old discrepancy', () => {
  const changed = structuredClone(cases)
  changed[3].observedOwner = false
  assert.throws(() => compareReaders(changed), /(?:oracle|js) changed/)
})

test('a corpus edit cannot silently reuse its old classification', () => {
  const changed = structuredClone(cases)
  changed[0].source += '\n'
  assert.throws(() => compareReaders(changed), /corpus trace changed/)
})

test('a missing target is a failed comparison, not an unowned line', () => {
  const changed = structuredClone(cases)
  changed[0].target = 'absent'
  assert.throws(() => compareReaders(changed), /exactly one target/)
})

test('removing a discrepancy declaration fails the evidence check', () => {
  const changed = structuredClone(cases)
  delete changed[2].discrepancy
  assert.throws(() => compareReaders(changed), /undeclared discrepancy/)
})

test('generated Rocq examples cover both deepest states and every source trace', () => {
  const checks = generateChecks()
  assert.equal((checks.match(/^Example table_/gm) ?? []).length, 28)
  assert.equal((checks.match(/^Example trace_/gm) ?? []).length, 6)
  assert.match(checks, /boundary_state quote true = \(true, true\)/)
  assert.match(checks, /boundary_state quote false = \(true, false\)/)
  assert.match(checks, /boundary_state end_input true = \(false, false\)/)
  assert.match(checks, /Definition boundary_coverage \(b : boundary\) : bool := match b with/)
  assert.doesNotMatch(checks, /\| _ =>/)
})

test('a changed marker or follower column cannot reuse the old frame', () => {
  const marker = structuredClone(cases)
  marker[0].source = marker[0].source.replace('- one', '1. one')
  assert.throws(() => compareReaders(marker), /column-zero/)
  const column = structuredClone(cases)
  column[0].column = 1
  assert.throws(() => compareReaders(column), /follower column changed/)
})

test('local axioms and proof admissions are rejected before compilation', () => {
  for (const source of ['Theorem t : True. Admitted.', 'Axiom t : False.',
    'Lemma t : False. Proof. admit. Qed.', 'Parameter t : False.',
    'Hypothesis t : False.', 'Variable t : False.', 'Conjecture t : False.',
    'Context (t : False).', 'Admit Obligations.']) {
    assert.throws(() => validateProofSource(source), /forbidden/)
  }
  validateProofSource('Theorem t : True. Proof. exact I. Qed.')
})

test('assumption reports cannot omit a theorem or depend on an imported axiom', () => {
  const closed = 'CARVE_ASSUMPTIONS:t\nClosed under the global context\n'
  validateAssumptions(closed, ['t'])
  assert.throws(() => validateAssumptions(closed, ['t', 'u']), /Missing/)
  assert.throws(() => validateAssumptions(closed, ['u']), /wrong theorem/)
  assert.throws(() => validateAssumptions(closed + 'Axioms:\nbad : False\n', ['t']), /depends on assumptions/)
})

test('every declared theorem gets a generated assumption report', () => {
  const source = '(* Theorem hidden : False. (* nested comment *) *)\n' +
    'Theorem first : True. Proof. exact I. Qed. Lemma second (n : nat) : n = n. Proof. reflexivity. Qed.'
  assert.deepEqual(validateProofSource(source), ['first', 'second'])
  const generated = generateChecks(source)
  assert.match(generated, /Print Assumptions first\./)
  assert.match(generated, /Print Assumptions second\./)
  assert.doesNotMatch(generated, /Print Assumptions hidden\./)
  assert.throws(() => validateProofSource(source + '\nPrint Assumptions first.'), /must not print/)
})

test('the prototype rejects disabled kernel checks', () => {
  for (const check of ['Guard', 'Positivity', 'Universe']) {
    assert.throws(() => validateProofSource(`Unset ${check} Checking.`), /must remain enabled/)
  }
})
