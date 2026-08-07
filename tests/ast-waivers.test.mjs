/*
 * The POSITION declaration, and the grouped report that hid what it declares.
 *
 * `scripts/spec/ast-waivers.mjs` is only reachable from `npm run ast:check`,
 * which needs three built engine checkouts - so without this file the
 * declaration's three directions would be exercised only on a host that has
 * them, which is not the host most changes are written on.
 *
 * Every direction below is driven on hand-built inputs, so each assertion FAILS
 * if the corresponding branch is removed. That matters most for the FIXED
 * direction: the sibling declaration in resources/ast-value-divergence.txt
 * promised the same direction and could not fire, for eight months, because the
 * only code path that reached it ran under a condition that excluded it
 * (carve#534).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  describeDocuments,
  groupFindings,
  notReconciledBecause,
  parseWaivers,
  partitionFindings,
  splitFinding,
  waivableType,
} from '../scripts/spec/ast-waivers.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const declare = (text) => {
  const { declared, errors } = parseWaivers(text)
  assert.deepEqual(errors, [], `fixture declaration did not parse: ${errors.join('; ')}`)

  return declared
}

test('a finding splits into its document and its text', () => {
  assert.deepEqual(splitFinding('03-links-12.crv: missing pos on "text" at $.children[0]'), {
    document: '03-links-12.crv',
    text: 'missing pos on "text" at $.children[0]',
  })
  // A synthetic sample carries no filename, and must not be mistaken for one.
  assert.deepEqual(splitFinding('<astral: emphasis after an emoji>: parse threw'), {
    document: null,
    text: '<astral: emphasis after an emoji>: parse threw',
  })
})

test('only a missing position is waivable', () => {
  assert.equal(waivableType('missing pos on "table_cell" at $.rows[0]'), 'table_cell')
  assert.equal(waivableType('§1a two adjacent text runs at $.children'), null)
  assert.equal(
    waivableType('pos does not cover the text it belongs to on "text" at $.children[0]'),
    null,
  )
})

test('a status must be "permitted" or a fully qualified issue', () => {
  const { errors } = parseWaivers(
    ['carve-js  a.crv  text  1  wontfix', 'carve-js  b.crv  text  1  #716'].join('\n'),
  )
  assert.equal(errors.length, 2, errors.join('; '))
  // "permitted" is the status that silences a finding, so a status this cannot
  // read must never fall back to it.
  for (const e of errors) assert.match(e, /status must be/)
})

test('a malformed count is an error rather than a zero', () => {
  const { errors } = parseWaivers('carve-js  a.crv  text  many  permitted')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /count must be a positive integer/)
})

test('the same engine, document and type may not be declared twice', () => {
  const { errors } = parseWaivers(
    ['carve-js  a.crv  text  1  permitted', 'carve-js  a.crv  text  2  permitted'].join('\n'),
  )
  assert.equal(errors.length, 1)
  assert.match(errors[0], /declared twice/)
})

test('a permitted line waives and an issue line stays outstanding', () => {
  const declared = declare(
    [
      'carve-js  a.crv  text  2  permitted',
      'carve-js  b.crv  figure  1  markup-carve/carve-js#1',
    ].join('\n'),
  )
  const result = partitionFindings(
    'carve-js',
    [
      'a.crv: missing pos on "text" at $.children[0]',
      'a.crv: missing pos on "text" at $.children[2]',
      'b.crv: missing pos on "figure" at $.children[0]',
    ],
    declared,
  )
  assert.deepEqual(result.problems, [])
  assert.equal(result.waived, 2)
  assert.equal(result.outstanding, 1)
  assert.equal(result.undeclared, 0)
})

test('UNWAIVED: a finding no line covers', () => {
  const declared = declare('carve-js  a.crv  text  1  permitted')
  const result = partitionFindings(
    'carve-js',
    ['a.crv: missing pos on "text" at $.c[0]', 'z.crv: missing pos on "heading" at $.c[0]'],
    declared,
  )
  assert.equal(result.problems.length, 1)
  assert.match(result.problems[0], /^UNWAIVED\s+carve-js\s+z\.crv\s+heading\s+1/)
  // Counted, not merely reported: the four buckets must add up to the total, or
  // the report's own summary line understates what the run measured.
  assert.equal(result.undeclared, 1)
  assert.equal(result.waived + result.outstanding + result.undeclared + result.unwaivable, 2)
})

test('COUNT: a declared line whose count moved', () => {
  const declared = declare('carve-js  a.crv  text  3  permitted')
  const result = partitionFindings(
    'carve-js',
    ['a.crv: missing pos on "text" at $.c[0]', 'a.crv: missing pos on "text" at $.c[1]'],
    declared,
  )
  assert.equal(result.problems.length, 1)
  assert.match(result.problems[0], /^COUNT\s+carve-js\s+a\.crv\s+text\s+declares 3, measured 2$/)
})

test('FIXED: a declared line nothing produces any more', () => {
  const declared = declare('carve-rs  a.crv  figure  1  markup-carve/carve-rs#737')
  const result = partitionFindings('carve-rs', [], declared)
  assert.equal(result.problems.length, 1)
  assert.match(result.problems[0], /^FIXED\s+carve-rs\s+a\.crv\s+figure/)
  assert.match(result.problems[0], /delete the line/)
})

test('FIXED fires for an engine with NO findings at all', () => {
  // The direction the value panel could not reach. An engine that has fixed
  // everything is precisely when a stale line has to go, and a reconciliation
  // reachable only when something is still wrong can never say so.
  const declared = declare(
    [
      'carve-js  a.crv  text  1  permitted',
      'carve-rs  a.crv  text  1  permitted',
    ].join('\n'),
  )
  const clean = partitionFindings('carve-js', [], declared)
  assert.equal(clean.problems.length, 1)
  assert.match(clean.problems[0], /^FIXED\s+carve-js/)
})

test('a declaration for one engine never covers another', () => {
  const declared = declare('carve-js  a.crv  text  1  permitted')
  const result = partitionFindings('carve-rs', ['a.crv: missing pos on "text" at $.c[0]'], declared)
  assert.equal(result.problems.length, 1)
  assert.match(result.problems[0], /^UNWAIVED\s+carve-rs/)
})

test('a finding that is not a position can never be waived', () => {
  const declared = declare('carve-js  a.crv  text  1  permitted')
  const result = partitionFindings(
    'carve-js',
    ['a.crv: §1a two adjacent text runs at $.children'],
    declared,
  )
  assert.equal(result.unwaivable, 1)
  assert.equal(result.waived, 0)
  // And the now-unproduced line still reports, so a waiver file cannot be kept
  // alive by an unrelated finding in the same document.
  assert.equal(result.problems.length, 1)
  assert.match(result.problems[0], /^FIXED/)
})

test('the grouped report keeps every document, not one example', () => {
  // The C3 defect, driven directly: two documents, one group. The old grouping
  // kept `example` - the FIRST document - so the second was unreachable, and
  // carve-php's whole report read as one cause in one file when it was six
  // files and at least two causes (carve#534).
  const groups = groupFindings([
    '03-links-12.crv: missing pos on "text" at $.children[0]',
    '182-openers-past-the-nesting-cap.crv: missing pos on "text" at $.children[3]',
    '182-openers-past-the-nesting-cap.crv: missing pos on "text" at $.children[5]',
  ])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].n, 3)
  assert.deepEqual(
    [...groups[0].documents].sort(),
    ['03-links-12.crv', '182-openers-past-the-nesting-cap.crv'],
  )
  assert.equal(groups[0].key, 'missing pos on "text" at <path>')
})

test('groups rank by count and the description names up to three documents', () => {
  const groups = groupFindings([
    'a.crv: missing pos on "text" at $.c[0]',
    'b.crv: missing pos on "text" at $.c[0]',
    'c.crv: missing pos on "figure" at $.c[0]',
  ])
  assert.deepEqual(groups.map((g) => g.n), [2, 1])
  assert.equal(describeDocuments(groups[0].documents), '2 document(s): a.crv, b.crv')
  assert.equal(
    describeDocuments(new Set(['e.crv', 'a.crv', 'b.crv', 'c.crv', 'd.crv'])),
    '5 document(s): a.crv, b.crv, c.crv (+2 more)',
  )
  assert.equal(describeDocuments(new Set()), '')
})

test('the shipped declaration parses and every outstanding line names an issue', () => {
  const text = readFileSync(resolve(root, 'resources/ast-position-waivers.txt'), 'utf8')
  const { declared, errors } = parseWaivers(text)
  assert.deepEqual(errors, [], errors.join('; '))
  assert.ok(declared.size > 0, 'the declaration is empty')

  // NO FLOOR ON THE OWED HALF. This used to require at least one outstanding
  // line, on the grounds that a split with an empty side is vacuous. That
  // reasoning holds for the SPLIT and not for this file: what makes the split
  // meaningful is that `parseWaivers` and `partitionFindings` treat the two
  // statuses differently, which the eight synthetic tests above drive on
  // hand-built input, each failing if its branch is removed. A floor here
  // asserts something else entirely - that some engine currently owes a
  // position - and on 2026-08-07 the last of those debts was paid
  // (carve-js#813 and #814, carve-rs#716, #736 and #737, carve-php#965 all
  // landed). A test that fails when the fleet becomes conformant is a test that
  // has to be edited to accept good news, which is the wrong way round.
  //
  // What is still enforced below is the rule that outlives the emptiness: any
  // line that IS outstanding names a fully qualified engine issue. That is the
  // assertion a new declaration has to satisfy, and it is reachable the moment
  // one is added.
  const owed = [...declared.values()].filter((d) => d.status !== 'permitted')
  for (const line of owed) {
    // FULLY QUALIFIED. A bare `#716` in this repo resolves to carve#716, not to
    // the engine issue it means, so it would link the wrong ticket.
    assert.match(
      line.status,
      /^markup-carve\/carve-(js|rs|php)#\d+$/,
      `${line.document} ${line.type} names "${line.status}"`,
    )
  }
})

test('every document a waiver names exists in the corpus', () => {
  // A renamed or renumbered fixture leaves a line that can never be produced
  // again. It would fail as FIXED on a host with the engines built - and pass
  // silently everywhere else, which is most hosts.
  const text = readFileSync(resolve(root, 'resources/ast-position-waivers.txt'), 'utf8')
  const { declared } = parseWaivers(text)
  for (const line of declared.values()) {
    assert.ok(
      readFileSync(resolve(root, 'tests/corpus', line.document), 'utf8').length >= 0,
      `${line.document} is declared but not in tests/corpus`,
    )
  }
})

test('a DERIVED engine is not reconciled against the declaration', () => {
  // carve-rb serializes carve-rs's tree, so its position findings ARE
  // carve-rs's arriving a second time. Reconciling them would record one
  // engine's debt twice and fail every host with the Ruby binding built - which
  // is every CI run of .github/workflows/ast-conformance.yml. The shape panel
  // already withholds that engine's vote for the same reason.
  assert.equal(notReconciledBecause('carve-js'), null)
  assert.equal(notReconciledBecause('carve-rs'), null)
  assert.equal(notReconciledBecause('carve-php'), null)
  assert.match(notReconciledBecause('carve-rb'), /publishes another engine's tree/)

  // And the declaration file must never name one, or the exemption above would
  // make those lines permanently unreachable - a FIXED that can never clear.
  const text = readFileSync(resolve(root, 'resources/ast-position-waivers.txt'), 'utf8')
  const { declared } = parseWaivers(text)
  for (const line of declared.values()) {
    assert.equal(
      notReconciledBecause(line.engine),
      null,
      `${line.engine} is declared but never reconciled, so this line can never be checked`,
    )
  }
})
