/*
 * The structural-signature helpers behind scripts/ast-conformance.mjs.
 *
 * Extracted and tested because the shape comparison had a branch it could not
 * survive: `definition_list.items` holds an array OF arrays, shapeOf maps that
 * to an array of shapes, and shapePaths assumed every shape was an object. It
 * threw `shape.children is not iterable` and killed the run - AFTER the
 * position findings had printed, so the output read like a report that had
 * finished rather than one that had died. Every definition-list document in the
 * corpus reached it, so the comparison had never once run for any of them.
 *
 * The report only reaches that code with a sibling engine checkout present, so
 * CI without one never hit it. These tests need no engines.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@markup-carve/carve'
import { classifyShapeDisagreement, shapeOf, shapePaths } from '../scripts/spec/ast-shape.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

test('shapePaths walks a nested array without throwing', () => {
  // The exact value shape that used to throw: a field holding an array whose
  // entries are themselves arrays of nodes.
  const shape = shapeOf({
    type: 'definition_list',
    items: [[{ type: 'definition_term' }, { type: 'definition_description' }]],
  })
  const paths = shapePaths(shape)
  assert.deepEqual(paths, [
    '$:definition_list',
    '$.items[0][0]:definition_term',
    '$.items[0][1]:definition_description',
  ])
})

test('every corpus definition list produces a walkable signature', () => {
  // A synthetic node proves the branch; the corpus proves the branch is the one
  // real documents take. Both matter - the crash was found by a real document.
  const source = readFileSync(
    resolve(repo, 'tests/corpus/25-definition-lists.crv'),
    'utf8',
  )
  const paths = shapePaths(shapeOf(parse(source)))
  assert.ok(paths.length > 0, 'signature is empty')
  assert.ok(
    paths.some((p) => p.endsWith(':definition_list')),
    `no definition_list in the signature: ${paths.join(' ')}`,
  )
})

test('a signature drops positions and values, and keeps types', () => {
  const shape = shapeOf({
    type: 'paragraph',
    pos: { startLine: 1, endLine: 1, startColumn: 1, endColumn: 4, startOffset: 0, endOffset: 3 },
    children: [{ type: 'text', value: 'abc' }],
  })
  assert.deepEqual(shapePaths(shape), ['$:paragraph', '$.children[0]:text'])
})

/*
 * The three-way panel (carve#747). These exist because the runner's own version
 * of this classification could not be made to fail on purpose: seeing it handle
 * a three-way split meant finding a corpus document that produced one, and the
 * whole point of the panel is the cases nobody has found yet.
 */
test('a unanimous document names no engine', () => {
  assert.deepEqual(
    classifyShapeDisagreement([
      ['carve-js', 'A'],
      ['carve-rs', 'A'],
      ['carve-php', 'A'],
    ]),
    { kind: 'unanimous' },
  )
})

test('the engine that stands alone is named wherever it sits', () => {
  const signatures = (js, rs, php) => [
    ['carve-js', js],
    ['carve-rs', rs],
    ['carve-php', php],
  ]

  // THE CASE THE OLD CHECK COULD NOT REPORT: the reference is the odd one out,
  // and the other two agree with each other (carve-js#697 was 41 documents of
  // exactly this, reported as two engines failing).
  assert.deepEqual(classifyShapeDisagreement(signatures('X', 'A', 'A')), {
    kind: 'alone',
    engine: 'carve-js',
  })
  assert.deepEqual(classifyShapeDisagreement(signatures('A', 'X', 'A')), {
    kind: 'alone',
    engine: 'carve-rs',
  })
  assert.deepEqual(classifyShapeDisagreement(signatures('A', 'A', 'X')), {
    kind: 'alone',
    engine: 'carve-php',
  })
})

test('three engines that all differ are not attributed to one of them', () => {
  assert.deepEqual(
    classifyShapeDisagreement([
      ['carve-js', 'A'],
      ['carve-rs', 'B'],
      ['carve-php', 'C'],
    ]),
    { kind: 'three-way' },
  )
})

test('a document one engine could not serialize is skipped, not counted as a split', () => {
  // Otherwise the engine with a crash also gets a shape finding for the same
  // document, and a harness limit (the runner's own output buffer, once) reads
  // as a disagreement about the tree.
  const verdict = classifyShapeDisagreement([
    ['carve-js', 'A'],
    ['carve-rs', 'A'],
    ['carve-php', undefined],
  ])
  assert.equal(verdict.kind, 'skipped')
})

test('two engines cannot form a majority', () => {
  const verdict = classifyShapeDisagreement([
    ['carve-js', 'A'],
    ['carve-rs', 'B'],
  ])
  assert.equal(verdict.kind, 'skipped')
})
