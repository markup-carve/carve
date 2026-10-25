/*
 * The pinned serializer still uses 1.2 `delim` and `bulletChar`. The 2.0
 * schema groups marker choice in one discriminated object. These controls
 * keep the old encoder's default-omission behavior visible during rollout
 * and check that non-default source markers survive (carve#2828, carve#3598).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, renderCarve, toAstJson } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(resolve(root, 'resources/ast-schema.json'), 'utf8'))

const list = (src) => {
  const node = toAstJson(parse(src)).children[0]
  assert.equal(node.type, 'list', `${JSON.stringify(src)} did not parse as a list`)
  return node
}

const AHEAD_OF_PIN = 'The pinned list serializer still emits the 1.2 marker fields (carve#3598).'

test('the 2.0 schema puts marker choice in one discriminated object', () => {
  const marker = schema.$defs.list.properties.marker
  assert.equal(marker.$ref, '#/$defs/listMarker')
  assert.deepEqual(schema.$defs.listMarker.oneOf.map((branch) => branch.properties.kind.const), ['bullet', 'ordered'])
  assert.ok(!('delim' in schema.$defs.list.properties))
  assert.ok(!('bulletChar' in schema.$defs.list.properties))
})

test('a parse omits `delim` on the default `.` marker', () => {
  const node = list('1. Note text.\n')
  if (AHEAD_OF_PIN) {
    assert.ok(!('delim' in node) && !('marker' in node), 'the pinned marker shape caught up; delete AHEAD_OF_PIN')
  } else assert.equal(node.marker.delimiter, undefined)
})

test('a parse omits `bulletChar` on the default `-` marker', () => {
  const node = list('- item\n')
  if (AHEAD_OF_PIN) {
    assert.ok(!('bulletChar' in node) && !('marker' in node), 'the pinned marker shape caught up; delete AHEAD_OF_PIN')
  } else assert.equal(node.marker.char, '-')
})

test('a non-default marker is still recorded, which is what separates this from deleting the fields', () => {
  if (AHEAD_OF_PIN) {
    assert.equal(list('1) Note text.\n').delim, ')')
    assert.equal(list('* item\n').bulletChar, '*')
  } else {
    assert.equal(list('1) Note text.\n').marker.delimiter, ')')
    assert.equal(list('* item\n').marker.char, '*')
  }
})

test('omitting the default loses nothing, which is what makes it safe', () => {
  // The asymmetry the ruling turns on: the two spellings describe one document.
  // A writer handed the omitted form has to reach the same source back, or
  // dropping the field would be a loss rather than a normalization.
  for (const src of ['1. Note text.\n', '- item\n', '1) Note text.\n', '* item\n']) {
    assert.equal(renderCarve(parse(src)), src, `${JSON.stringify(src)} is not a fixed point`)
  }
})
