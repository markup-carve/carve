/*
 * A span is measured against the source the engine READ, not the fixture bytes.
 *
 * PART 0 INPUT replaces every U+0000 with U+FFFD before the first line is read,
 * one codepoint for one. So for a document carrying the byte, the text a node
 * reports and the text the fixture holds are different strings at the same
 * offsets, and slicing the fixture reports a correct span as a wrong one.
 *
 * `scripts/ast-conformance.mjs` did exactly that, and the shape of the failure
 * is why this is pinned rather than left to the report. Every engine replaces
 * the NUL, so every engine's text held U+FFFD, so the false finding appeared on
 * ALL of them identically - which is precisely the signature the three-way
 * panel cannot surface as a divergence, and precisely what a real unanimous
 * defect looks like. carve#1522 was a real one, found that way a day earlier.
 * Telling the two apart by eye is what this removes (carve#1531).
 *
 * ONLY the NUL replacement is applied. The BOM strip and the line-ending fold
 * change LENGTH, and the engines report positions against the source as it
 * arrived, so folding those here would move every offset in a CRLF or BOM'd
 * document (carve#876). `tests/ast-positions.test.mjs` set that precedent; this
 * file exists to keep the report and that test saying the same thing.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@markup-carve/carve'
import { replaceNulls } from '../scripts/spec/layout.mjs'
import { checkPositions } from '../scripts/spec/ast-positions.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

/** The one corpus document whose source differs from its bytes. */
const NUL_CASE = 'tests/corpus/397-a-null-byte-is-replaced-before-the-document-is-read.crv'

test('the NUL corpus document is measured against the replaced source, not its bytes', () => {
  const raw = readFileSync(resolve(repo, NUL_CASE), 'utf8')
  // Non-vacuity: if the fixture ever stops carrying the byte, every assertion
  // below passes for the wrong reason and the rule goes unmeasured.
  assert.ok(
    raw.includes('\u0000'),
    NUL_CASE + ' no longer carries a NUL - this test measures nothing',
  )

  const doc = parse(raw)

  // The bytes are the WRONG basis, and this half is what keeps the fix honest:
  // a normalization that quieted the document unconditionally would leave this
  // assertion unsatisfiable.
  const againstBytes = []
  checkPositions(doc, raw, againstBytes)
  assert.deepEqual(againstBytes, [
    'pos does not cover the text it belongs to on "text" at $.children[0].children[0]: ' +
      'offsets give "a\\u0000b", node says "a�b"',
  ])

  // The replaced source is the right basis, and the engine's offsets were
  // correct all along.
  const againstSource = []
  checkPositions(doc, replaceNulls(raw), againstSource)
  assert.deepEqual(againstSource, [])
})

test('the conformance report normalizes the source it measures against', () => {
  // Asserted on the source rather than by running the script, for the reason
  // `tests/ast-conformance-measures-before-it-gates.test.mjs` gives: a run needs
  // four engines built from their mains, so this path is only ever exercised by
  // a scheduled workflow - which is exactly how the defect survived.
  const script = readFileSync(resolve(repo, 'scripts/ast-conformance.mjs'), 'utf8')
  assert.match(
    script,
    /import \{ replaceNulls \} from '\.\/spec\/layout\.mjs'/,
    'scripts/ast-conformance.mjs no longer imports replaceNulls',
  )
  const at = script.indexOf('function checkDocument(')
  assert.notEqual(at, -1, 'checkDocument is gone from scripts/ast-conformance.mjs')
  const body = script.slice(at)
  const normalizes = body.indexOf('const source = replaceNulls(raw)')
  assert.notEqual(
    normalizes,
    -1,
    'checkDocument no longer replaces NULs before measuring. Every engine will now\n' +
      'report a false span on ' +
      NUL_CASE +
      ', identically, which the three-way\n' +
      'panel cannot surface as a divergence (carve#1531).',
  )
  // Ordering, not just presence: the replacement has to happen BEFORE the rules
  // that slice, or it describes a variable nothing reads.
  for (const call of [
    'checkPositions(doc, source, own)',
    'checkReferenceFields(doc, source, own)',
  ]) {
    const callAt = body.indexOf(call)
    assert.notEqual(callAt, -1, 'checkDocument no longer calls ' + call)
    assert.ok(callAt > normalizes, call + ' is measured before the NUL replacement is applied')
  }
})
