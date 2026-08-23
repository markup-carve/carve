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
  EXTENT_RULE_IDS,
  describeDocuments,
  extentFinding,
  groupFindings,
  isReferenceShapeFinding,
  notReconciledBecause,
  parseExtentDeclarations,
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

const declareExtents = (text) => {
  const { declared, errors } = parseExtentDeclarations(text)
  assert.deepEqual(errors, [], `fixture extent declaration did not parse: ${errors.join('; ')}`)

  return declared
}

/** The finding text `checkStopsAtChildren` produces, verbatim in its shape. */
const pastLastChild = (document, type, at = '$.children[0]') =>
  `${document}: span reaches past its last child on "${type}" at ${at}: ` +
  'it ends at 27, its last child ends at 26, and "\n" belongs to no child of it'

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
  assert.equal(
    result.waived +
      result.outstanding +
      result.undeclared +
      result.extent +
      result.reference +
      result.ungated,
    2,
  )
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

test('a finding that is not a position can never be waived, and now it GATES', () => {
  // THE DEFECT carve#1637 IS ABOUT. This used to land in a counter called
  // `unwaivable`, which incremented and `continue`d - so the finding was
  // printed in full, absorbed by no line, and produced no problem entry either.
  // A grep of a whole run for UNWAIVED returned nothing while thirty §4
  // violations per engine sat in that counter.
  const declared = declare('carve-js  a.crv  text  1  permitted')
  const result = partitionFindings(
    'carve-js',
    ['a.crv: §1a two adjacent text runs at $.children'],
    declared,
  )
  assert.equal(result.ungated, 1)
  assert.equal(result.waived, 0)
  assert.equal(result.ungatedProblems.length, 1)
  assert.match(result.ungatedProblems[0], /^UNGATED\s+carve-js/)
  assert.match(result.ungatedProblems[0], /no ledger covers this finding class/)
  // And the now-unproduced line still reports, so a waiver file cannot be kept
  // alive by an unrelated finding in the same document.
  assert.equal(result.problems.length, 1)
  assert.match(result.problems[0], /^FIXED/)
})

test('a cross-engine shape diff is counted and named, and gated by neither ledger', () => {
  // THE ONE CLASS THAT MUST NOT GATE HERE, and the reason it is named rather
  // than dropped. `checkShapeParity` diffs a satellite against carve-js, and
  // this fleet ports a fix over several days - so the engine that is RIGHT is
  // routinely the odd one out, and the run's own policy for that family is to
  // attribute it loudly and let the panel carry it. A reference checkout off
  // its pin makes the line describe the operator's working copy besides.
  //
  // Silently dropping it would be the carve#1637 defect wearing a new hat, so
  // it lands in its own counted bucket and on the engine's summary line.
  assert.equal(
    isReferenceShapeFinding(
      'tree differs from the reference at $.children[1]:footnote - reference has 12 nodes, this has 12',
    ),
    true,
  )
  assert.equal(isReferenceShapeFinding('missing pos on "text" at $.c[0]'), false)
  assert.equal(isReferenceShapeFinding('span reaches past its last child on "footnote" at $.c[0]: x'), false)

  const result = partitionFindings(
    'carve-php',
    [
      '410-a-footnote-continuation-survives-a-blank-run.crv: tree differs from the reference ' +
        'at $.children[1]:footnote - reference has 10 nodes, this has 10 (got $.children[1]:paragraph)',
    ],
    declare(''),
    declareExtents(''),
  )
  assert.equal(result.reference, 1)
  assert.equal(result.ungated, 0)
  assert.deepEqual(result.problems, [])
  assert.deepEqual(result.extentProblems, [])
  assert.deepEqual(result.ungatedProblems, [])
})

test('every §4 extent rule is recognized, and nothing else is', () => {
  assert.deepEqual(extentFinding('span reaches past its last child on "footnote" at $.c[0]: it ends at 27'), {
    rule: 'ends-past-last-child',
    type: 'footnote',
  })
  assert.deepEqual(
    extentFinding('span stops at its last PLACED child on "list" at $.c[0]: it ends at 4'),
    { rule: 'ends-before-placed-child', type: 'list' },
  )
  assert.deepEqual(
    extentFinding('pos does not begin at the markup that opens "block_quote" at $.c[0]: offset 2'),
    { rule: 'starts-past-opening-markup', type: 'block_quote' },
  )
  assert.deepEqual(
    extentFinding('span covers more than its own markup on an empty "div" at $.c[0]: [0, 9]'),
    { rule: 'empty-span-covers-more', type: 'div' },
  )
  // A missing position is the OTHER ledger's, and a slice mismatch is neither.
  assert.equal(extentFinding('missing pos on "text" at $.c[0]'), null)
  assert.equal(
    extentFinding('pos does not cover the text it belongs to on "text" at $.c[0]: offsets give "a"'),
    null,
  )
  assert.equal(extentFinding('§1a two adjacent text runs at $.children'), null)
  // The ids the declaration file may name are exactly the rules above.
  assert.deepEqual(EXTENT_RULE_IDS, [
    'ends-past-last-child',
    'ends-before-placed-child',
    'starts-past-opening-markup',
    'empty-span-covers-more',
  ])
})

test('the extent ledger refuses a "permitted" status', () => {
  // THE OFF-SWITCH TEST. The sibling file has a permitted category because §4
  // exempts a REASSEMBLED node - no honest span exists. A span that exists and
  // points at the wrong codepoint has no such reading, so the one status that
  // would silence a finding here must not be reachable, by typo or otherwise.
  const { errors } = parseExtentDeclarations('carve-rs  ends-past-last-child  footnote  3  permitted')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /never "permitted"/)
})

test('the extent ledger refuses a rule it does not know', () => {
  const { errors } = parseExtentDeclarations('carve-rs  ends-somewhere  footnote  3  markup-carve/carve-rs#1')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /unknown rule "ends-somewhere"/)
})

test('the extent ledger refuses a bare issue reference', () => {
  // A bare `#1303` in this repo resolves to carve#1303, not to the engine issue
  // it means - the same trap the position ledger's own test guards.
  const { errors } = parseExtentDeclarations('carve-rs  ends-past-last-child  footnote  3  #1303')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /owner\/repo#N/)
})

test('UNDECLARED: a §4 extent finding no line covers fails, and prints the line to paste', () => {
  const result = partitionFindings(
    'carve-rs',
    [pastLastChild('204-a-heading-in-a-footnote-body.crv', 'footnote'), pastLastChild('312-a-note-body.crv', 'footnote')],
    declare(''),
    declareExtents(''),
  )
  assert.equal(result.extent, 2)
  assert.equal(result.ungated, 0)
  assert.equal(result.extentProblems.length, 1)
  assert.match(result.extentProblems[0], /^UNDECLARED\s+carve-rs\s+ends-past-last-child\s+footnote\s+2/)
  assert.match(
    result.extentProblems[0],
    /record it as: {2}carve-rs {2}ends-past-last-child {2}footnote {2}2 {2}<owner\/repo#N>/,
  )
  // The position ledger is untouched by an extent finding.
  assert.deepEqual(result.problems, [])
})

test('a declared §4 extent finding at its declared count passes', () => {
  const result = partitionFindings(
    'carve-rs',
    [pastLastChild('a.crv', 'footnote'), pastLastChild('b.crv', 'footnote')],
    declare(''),
    declareExtents('carve-rs  ends-past-last-child  footnote  2  markup-carve/carve-rs#1303'),
  )
  assert.deepEqual(result.extentProblems, [])
  assert.equal(result.extent, 2)
})

test('COUNT: an extent declaration fails when the number moves DOWN', () => {
  // The ratchet direction that matters. An engine fixing one of three must
  // lower the line, or the ledger keeps claiming a violation that is gone.
  const result = partitionFindings(
    'carve-rs',
    [pastLastChild('a.crv', 'footnote')],
    declare(''),
    declareExtents('carve-rs  ends-past-last-child  footnote  3  markup-carve/carve-rs#1303'),
  )
  assert.equal(result.extentProblems.length, 1)
  assert.match(
    result.extentProblems[0],
    /^COUNT\s+carve-rs\s+ends-past-last-child\s+footnote\s+declares 3, measured 1/,
  )
})

test('COUNT: an extent declaration fails when the number moves UP', () => {
  const result = partitionFindings(
    'carve-rs',
    [pastLastChild('a.crv', 'footnote'), pastLastChild('b.crv', 'footnote')],
    declare(''),
    declareExtents('carve-rs  ends-past-last-child  footnote  1  markup-carve/carve-rs#1303'),
  )
  assert.equal(result.extentProblems.length, 1)
  assert.match(result.extentProblems[0], /declares 1, measured 2/)
})

test('a NEW extent violation of an undeclared TYPE fails even at an unchanged total', () => {
  // Why the ledger keys on the node type rather than counting per engine: one
  // footnote fixed and one definition_term broken is a net-zero move, and a
  // bare per-engine total would call that conformant.
  const result = partitionFindings(
    'carve-rs',
    [pastLastChild('a.crv', 'definition_term')],
    declare(''),
    declareExtents('carve-rs  ends-past-last-child  footnote  1  markup-carve/carve-rs#1303'),
  )
  assert.equal(result.extentProblems.length, 2)
  assert.match(result.extentProblems[0], /^UNDECLARED\s+carve-rs\s+ends-past-last-child\s+definition_term/)
  assert.match(result.extentProblems[1], /^FIXED\s+carve-rs\s+ends-past-last-child\s+footnote/)
})

test('FIXED: an extent declaration for an engine with NO findings at all fails', () => {
  // THE TWO-DIRECTIONAL HALF, and the one a one-way silencer would not have.
  // An engine that has conformed is exactly when a line has to go, and a
  // reconciliation reachable only while something is still wrong can never
  // say so - the defect resources/ast-value-divergence.txt carried for eight
  // months (carve#534).
  const result = partitionFindings(
    'carve-rs',
    [],
    declare(''),
    declareExtents('carve-rs  ends-past-last-child  footnote  3  markup-carve/carve-rs#1303'),
  )
  assert.equal(result.extentProblems.length, 1)
  assert.match(result.extentProblems[0], /^FIXED\s+carve-rs\s+ends-past-last-child\s+footnote/)
  assert.match(result.extentProblems[0], /delete the line/)
})

test('an extent declaration for one engine never covers another', () => {
  const declaredExtents = declareExtents(
    'carve-rs  ends-past-last-child  footnote  1  markup-carve/carve-rs#1303',
  )
  const result = partitionFindings('carve-php', [pastLastChild('a.crv', 'footnote')], declare(''), declaredExtents)
  assert.equal(result.extentProblems.length, 1)
  assert.match(result.extentProblems[0], /^UNDECLARED\s+carve-php/)
})

test('every finding leaves through exactly one door, and the doors add up', () => {
  // The arithmetic the report prints. Its old form summed a bucket that could
  // not fail, so the line read "30 not a position" and the run exited 0.
  const result = partitionFindings(
    'carve-rs',
    [
      'a.crv: missing pos on "text" at $.c[0]',
      pastLastChild('a.crv', 'footnote'),
      'a.crv: §1a two adjacent text runs at $.children',
    ],
    declare('carve-rs  a.crv  text  1  permitted'),
    declareExtents('carve-rs  ends-past-last-child  footnote  1  markup-carve/carve-rs#1303'),
  )
  assert.equal(
    result.waived +
      result.outstanding +
      result.undeclared +
      result.extent +
      result.reference +
      result.ungated,
    3,
  )
  assert.equal(result.waived, 1)
  assert.equal(result.extent, 1)
  assert.equal(result.ungated, 1)
  // Only the ungated one fails: the other two are declared.
  assert.deepEqual(result.problems, [])
  assert.deepEqual(result.extentProblems, [])
  assert.equal(result.ungatedProblems.length, 1)
})

test('the shipped extent declaration parses, and every line names an ENGINE issue', () => {
  const text = readFileSync(resolve(root, 'resources/ast-extent-findings.txt'), 'utf8')
  const { declared, errors } = parseExtentDeclarations(text)
  assert.deepEqual(errors, [], errors.join('; '))
  for (const line of declared.values()) {
    // FULLY QUALIFIED, for the reason the position ledger's own test gives: a
    // bare number resolves against THIS repo and links the wrong ticket.
    assert.match(
      line.status,
      /^markup-carve\/carve-(js|rs|php)#\d+$/,
      `${line.engine} ${line.rule} ${line.type} names "${line.status}"`,
    )
    // And never a DERIVED engine, whose findings are another engine's arriving
    // a second time and are never reconciled - a FIXED that can never clear.
    assert.equal(
      notReconciledBecause(line.engine),
      null,
      `${line.engine} is declared but never reconciled, so this line can never be checked`,
    )
  }
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
