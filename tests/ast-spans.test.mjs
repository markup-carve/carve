/*
 * The SPAN panel: the comparison `ast:check` did not have.
 *
 * Before it, the run reported 83 findings, every one of them "missing pos", and
 * zero disagreements about where a present `pos` points - because nothing
 * compared them. `ast-values.mjs` drops every position key by name ("compared
 * elsewhere"), and elsewhere is `checkPositions`, which compares each engine
 * against the SOURCE and never against another engine.
 *
 * The trap this file exists to avoid repeating is in the second test below.
 * `checkPositions`'s only content-level rule asserts that a `text` node's span
 * SLICES TO its own value - a property every real divergence preserves. Two
 * engines pointing at different occurrences of the same character both pass it.
 * So nothing here asserts what a span slices to; it compares the spans.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  compareSpans,
  countPlaced,
  reconcileSpans,
  spanOf,
  spanSignature,
} from '../scripts/spec/ast-spans.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const at = (startOffset, endOffset, line = 1) => ({
  startLine: line,
  endLine: line,
  startColumn: startOffset + 1,
  endColumn: endOffset + 1,
  startOffset,
  endOffset,
})

const textNode = (value, pos) => ({ type: 'text', value, ...(pos ? { pos } : {}) })

test('the signature carries one entry per typed node, in document order', () => {
  const sig = spanSignature({
    type: 'paragraph',
    pos: at(0, 5),
    children: [textNode('hello', at(0, 5))],
  })
  assert.deepEqual(sig.map((s) => s.type), ['paragraph', 'text'])
  assert.ok(sig[0].span.includes('startOffset=0'))
})

test('a node with no pos signs as null rather than being dropped', () => {
  const sig = spanSignature({ type: 'paragraph', children: [textNode('a')] })
  assert.deepEqual(sig.map((s) => s.span), [null, null])
  assert.equal(spanOf({ type: 'text' }), null)
})

test('the signature keeps all six position keys', () => {
  // Lines and columns are derivable from the offsets and the source, which is
  // exactly why an engine deriving them wrongly would survive a comparison that
  // read offsets only.
  const a = spanSignature({ type: 'text', value: 'x', pos: at(0, 1, 1) })
  const b = spanSignature({ type: 'text', value: 'x', pos: at(0, 1, 4) })
  assert.notEqual(a[0].span, b[0].span)
})

test('THE TRAP: two spans that slice to the same text still disagree', () => {
  // `132-thematic-break-requires-contiguous-markers`, source `* * *`. carve-php
  // publishes text [0,1]; carve-js and carve-rs publish [4,5]. BOTH slices are
  // "*", so the slice rule in ast-positions.mjs passes for both. This is the
  // whole reason the panel compares spans and not what they slice to.
  const found = compareSpans(
    new Map([
      ['carve-js', spanSignature(textNode('*', at(4, 5)))],
      ['carve-rs', spanSignature(textNode('*', at(4, 5)))],
      ['carve-php', spanSignature(textNode('*', at(0, 1)))],
    ]),
    '132-thematic-break-requires-contiguous-markers.crv',
  )
  assert.equal(found.length, 1)
  assert.equal(found[0].key, 'text (extent)')
  assert.equal(found[0].kind, 'extent')
  assert.match(found[0].engines['carve-php'], /startOffset=0/)
  assert.match(found[0].engines['carve-js'], /startOffset=4/)
})

test('the finding is attributed to the engine whose offsets moved', () => {
  const same = at(11, 28)
  const marker = at(11, 13)
  const found = compareSpans(
    new Map([
      ['carve-js', spanSignature({ type: 'block_quote', pos: same, children: [] })],
      ['carve-rs', spanSignature({ type: 'block_quote', pos: marker, children: [] })],
      ['carve-php', spanSignature({ type: 'block_quote', pos: same, children: [] })],
    ]),
    '117-footnote-definition-inside-a-container-is-collected.crv',
  )
  assert.equal(found.length, 1)
  assert.equal(found[0].type, 'block_quote')
  assert.match(found[0].engines['carve-rs'], /endOffset=13/)
  assert.match(found[0].engines['carve-js'], /endOffset=28/)
})

test('presence and extent are separate rows, and never both for one node', () => {
  const found = compareSpans(
    new Map([
      ['carve-js', spanSignature({ type: 'figure', children: [] })],
      ['carve-rs', spanSignature({ type: 'figure', pos: at(0, 14), children: [] })],
      ['carve-php', spanSignature({ type: 'figure', pos: at(0, 18), children: [] })],
    ]),
    'x.crv',
  )
  // One engine omits AND the two that place it disagree - but there is nothing
  // to compare an extent against when a value is missing, so this is one
  // finding, not two.
  assert.deepEqual(found.map((f) => f.key), ['figure (presence)'])
  assert.equal(found[0].engines['carve-js'], 'absent')
  assert.equal(found[0].engines['carve-rs'], 'placed')
})

test('agreement produces nothing, including agreement on omitting', () => {
  const absent = () => spanSignature({ type: 'table_cell', children: [] })
  assert.deepEqual(
    compareSpans(
      new Map([['carve-js', absent()], ['carve-rs', absent()], ['carve-php', absent()]]),
      'x.crv',
    ),
    [],
  )
})

test('trees of different lengths are not compared', () => {
  // A different node count is a SHAPE disagreement, reported by ast-shape.mjs.
  // Pairing across them would compare unrelated nodes and invent divergences.
  const found = compareSpans(
    new Map([
      ['carve-js', spanSignature({ type: 'paragraph', pos: at(0, 1), children: [textNode('a', at(0, 1))] })],
      ['carve-rs', spanSignature({ type: 'paragraph', pos: at(0, 1), children: [] })],
      ['carve-php', spanSignature({ type: 'paragraph', pos: at(9, 9), children: [] })],
    ]),
    'x.crv',
  )
  assert.deepEqual(found, [])
})

test('THE OPT-IN TRAP: an engine that placed nothing is countable', () => {
  // Positions are behind a parse option in carve-rs and carve-php. A probe that
  // does not request them receives a tree with no `pos` anywhere - and every
  // comparison above would then be absent-against-absent, unanimous, and a
  // clean panel that measured nothing. The run asserts this count is non-zero
  // per engine before believing any of it.
  const unrequested = spanSignature({
    type: 'paragraph',
    children: [textNode('a'), textNode('b')],
  })
  assert.equal(countPlaced(unrequested), 0)

  const requested = spanSignature({
    type: 'paragraph',
    pos: at(0, 2),
    children: [textNode('a', at(0, 1)), textNode('b', at(1, 2))],
  })
  assert.equal(countPlaced(requested), 3)

  // And the comparison itself is silent on the unrequested tree, which is why
  // the count is the only thing that can tell the two states apart.
  assert.deepEqual(
    compareSpans(
      new Map([
        ['carve-js', unrequested],
        ['carve-rs', unrequested],
        ['carve-php', unrequested],
      ]),
      'x.crv',
    ),
    [],
  )
})

test('NEW: a row that disagrees and is not declared', () => {
  const problems = reconcileSpans(
    new Map([['list (extent)', new Set(['a.crv', 'b.crv'])]]),
    '# nothing\n',
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^NEW\s+list \(extent\) disagrees in 2 document\(s\)/)
})

test('COUNT: a declared row whose document count moved', () => {
  const problems = reconcileSpans(
    new Map([['list (extent)', new Set(['a.crv'])]]),
    'list (extent)  4\n',
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^COUNT\s+list \(extent\) declares 4 document\(s\), measured 1$/)
})

test('AGREED: a declared row that no longer disagrees', () => {
  const problems = reconcileSpans(new Map(), 'block_quote (extent)  16\n')
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^AGREED\s+block_quote \(extent\) no longer disagrees/)
})

test('a malformed declaration line is an error, never a silent skip', () => {
  const problems = reconcileSpans(new Map(), 'list  127\n')
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^MALFORMED\s+line 1/)
})

/*
 * WHAT `npm run ast:check` LAST MEASURED. Same contract, and same reason, as
 * `LAST_MEASURED` in tests/ast-values.test.mjs: this suite runs on a host with
 * no engine checkouts, so it cannot measure spans itself, and reconciling the
 * shipped file against an EMPTY measurement only stays falsifiable while the
 * ledger is empty - every declared row becomes an AGREED.
 *
 * Measured 2026-08-17 over 1131 corpus documents plus 3 synthetic samples, at
 * carve-js c8c8dc3, carve-rs 71318e9 and carve-php 30cc587, each built from a
 * fresh clone of main. Four rows across 8 documents, of 22,763 spans compared.
 *
 * The counts below are UNCHANGED from the measurement before this one and one
 * of the rows is not: `code (presence)` swapped its three documents and its
 * engine direction under a steady count of 3, which this map cannot see and
 * resources/ast-position-waivers.txt did - see the note in
 * resources/ast-span-divergence.txt. A stable number here is not evidence the
 * panel stood still.
 *
 * It read nine rows across 21 documents that morning and five across 9 an hour
 * later. carve-php shipped the 326/327/329/333 container rulings, then carve-js
 * shipped #1152 and #1154, and each time ast:check reported the rows AGREED or
 * COUNT and this map moved with the run rather than with the merge
 * notifications. Every remaining row is carve-php alone, and each names its own
 * tracker in resources/ast-span-divergence.txt: carve-php#1351, #1361, #1362
 * and #1363.
 */
const LAST_MEASURED = new Map([
  ['text (presence)', 3],
  ['code (presence)', 3],
  ['definition_list (extent)', 2],
  ['paragraph (extent)', 1],
])

const asMeasured = (counts) =>
  new Map(
    [...counts].map(([key, count]) => [
      key,
      new Set(Array.from({ length: count }, (_, i) => `measured-${i}.crv`)),
    ]),
  )

const shippedSpanDeclaration = () =>
  readFileSync(resolve(root, 'resources/ast-span-divergence.txt'), 'utf8')

test('the shipped span declaration is exactly what ast:check last measured', () => {
  // All three directions stay live without engines: a row in the file with no
  // measurement is AGREED, a measured row the file omits is NEW, and a count
  // edited on either side is COUNT. An empty ledger against an empty
  // `LAST_MEASURED` still reconciles to nothing, so there is no floor.
  assert.deepEqual(reconcileSpans(asMeasured(LAST_MEASURED), shippedSpanDeclaration()), [])
})

test('and a disagreement the shipped file does not declare is caught', () => {
  const measured = asMeasured(LAST_MEASURED)
  measured.set('table_cell (presence)', new Set(['a.crv', 'b.crv']))
  const problems = reconcileSpans(measured, shippedSpanDeclaration())
  assert.equal(problems.length, 1)
  assert.match(problems[0], /^NEW\s+table_cell \(presence\) disagrees in 2 document\(s\)/)
})
