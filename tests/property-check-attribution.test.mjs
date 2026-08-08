/*
 * The gate's own machinery, driven on hand-built inputs.
 *
 * scripts/property-check.mjs gates PART 11 section 1 over generated documents.
 * `DECLARED` is EMPTY today - carve#1027 was the last shape in it - so nothing
 * is forgiven, and everything below is exercised against a STUB writer with its
 * own declaration rather than against the shipped list. That is deliberate: the
 * machinery has to keep working for the next entry, and a test that could only
 * run while a real waiver existed would have died with the waiver, leaving the
 * attribution unguarded exactly when someone adds the next one. An attribution
 * that is too generous turns the gate back into the report it used to be,
 * silently, and the generated documents are the wrong place to notice that -
 * they are regenerated per run and nobody reads them.
 *
 * So each direction below is exercised against a stub writer whose behavior is
 * chosen, not observed. Every assertion fails if its branch is removed:
 *
 *   - a document that fails for an UNDECLARED reason is not attributed;
 *   - a document that fails for a declared reason AND another one is not
 *     attributed either, which is the case a coarse "does it contain the
 *     shape" test would have swallowed;
 *   - a declaration whose witness has been fixed is reported as stale, so a
 *     waiver cannot outlive its defect;
 *   - a declaration that rewrites documents not carrying its shape is reported
 *     as over-broad.
 *
 * The last two are the ones that rot quietly. resources/ast-value-divergence.txt
 * promised a FIXED direction and could not fire for eight months (carve#534).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  DECLARED,
  attribute,
  auditDeclarations,
  generateDocuments,
  untilStable,
  violation,
} from '../scripts/property-check.mjs'

/*
 * A stub engine. `carveToCarve` deletes every `!` and uppercases a `q`; the
 * first is a meaning-preserving normalization, the second is not, because
 * `carveToHtml` reports the two spellings differently.
 */
const stub = {
  carveToCarve: (src) => {
    if (src.includes('boom')) throw new Error('stub refused')
    return src.replaceAll('!', '').replaceAll('q', 'Q')
  },
  carveToHtml: (src) => `<p>${src.replaceAll('!', '')}</p>`,
}

const declared = [
  {
    id: 'bang',
    ticket: 'markup-carve/carve#0',
    what: 'a stub shape',
    witness: 'x q\n',
    control: 'plain\n',
    without: (src) => src.replaceAll('q', ''),
  },
]

test('a clean document is not a violation', () => {
  assert.equal(violation(stub, 'plain\n'), null)
})

test('a writer that is not idempotent is caught before meaning is compared', () => {
  const jumpy = { ...stub, carveToCarve: (src) => src + 'x' }
  assert.deepEqual(violation(jumpy, 'a\n'), { kind: 'idempotence' })
})

test('a writer that changes what a document says is a meaning violation', () => {
  assert.deepEqual(violation(stub, 'x q\n'), { kind: 'meaning' })
})

test('a writer that throws is reported rather than counted as a pass', () => {
  const found = violation(stub, 'boom\n')
  assert.equal(found?.kind, 'threw')
  assert.match(found.detail, /stub refused/)
})

test('a failing document is attributed to the declaration that fully explains it', () => {
  assert.equal(attribute(stub, 'x q\n', declared), 'bang')
})

test('a document failing for an undeclared reason is NOT attributed', () => {
  // `!` alone round-trips through this stub, so nothing here is the declared
  // shape; a document that fails without carrying it must reach the report.
  const other = { ...stub, carveToCarve: (src) => src.replaceAll('z', 'ZZ') }
  assert.equal(violation(other, 'z\n')?.kind, 'meaning')
  assert.equal(attribute(other, 'z\n', declared), null)
})

test('a document carrying a declared shape AND a second cause is not swallowed', () => {
  /*
   * The whole reason attribution removes the shape and re-tests instead of
   * matching on it. `k q` carries the declared `q`, so a containment test would
   * forgive it - but with the `q` gone it still fails, because this stub also
   * mangles `k`.
   */
  const alsoK = {
    carveToCarve: (src) => src.replaceAll('q', 'Q').replaceAll('k', 'K'),
    carveToHtml: (src) => `<p>${src}</p>`,
  }
  assert.equal(violation(alsoK, 'k q\n')?.kind, 'meaning')
  assert.equal(attribute(alsoK, 'k q\n', declared), null)
})

test('a declaration whose witness now passes is reported as stale', () => {
  const fixed = { carveToCarve: (src) => src, carveToHtml: (src) => src }
  const findings = auditDeclarations(fixed, declared)
  assert.equal(findings.length, 1)
  assert.match(findings[0], /stale/)
  assert.match(findings[0], /markup-carve\/carve#0/)
})

test('a declaration that rewrites a document without its shape is reported as over-broad', () => {
  const greedy = [{ ...declared[0], without: (src) => src.replaceAll('a', '') }]
  const findings = auditDeclarations(stub, greedy)
  assert.ok(
    findings.some((f) => /over-broad|control document/.test(f)),
    `expected an over-broad finding, got ${JSON.stringify(findings)}`,
  )
})

test('a declaration that cannot remove its own witness is reported', () => {
  const inert = [{ ...declared[0], without: (src) => src }]
  const findings = auditDeclarations(stub, inert)
  assert.ok(
    findings.some((f) => /does not remove its own witness/.test(f)),
    `expected an inert-rewrite finding, got ${JSON.stringify(findings)}`,
  )
})

test('the shipped declarations pass their own audit against the pinned engine', async () => {
  const lib = await import('@markup-carve/carve')
  assert.deepEqual(auditDeclarations(lib, DECLARED), [])
})

test('a rewrite is applied until it stops changing the document', () => {
  // One pass leaves `x \  ` still carrying the shape, which is how seed 7
  // produced a false UNDECLARED report before this existed.
  const once = (s) => s.replace(/(^|[^\\])\\ +$/gm, '$1')
  assert.match(once('x \\  \\ '), /\\/, 'one pass still leaves an escaped space behind')
  assert.equal(untilStable(once, 'x \\  \\ '), 'x ')
})

test('the generator is a pure function of its seed, and one seed extends the other', () => {
  const small = generateDocuments({ count: 20, seed: 12345 })
  const large = generateDocuments({ count: 40, seed: 12345 })
  assert.deepEqual(large.slice(0, 20), small)
  assert.notDeepEqual(generateDocuments({ count: 20, seed: 7 }), small)
  assert.equal(small.length, 20)
})
