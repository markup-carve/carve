import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { parse, renderHtml, toAstJson } from '@markup-carve/carve'

const fixtures = JSON.parse(readFileSync(new URL('../resources/ast-cell-wraps-acceptance.json', import.meta.url), 'utf8'))
const schema = JSON.parse(readFileSync(new URL('../resources/ast-schema.json', import.meta.url), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: true })
const validators = new Map()

function withoutFields(value, fields) {
  if (Array.isArray(value)) return value.map((child) => withoutFields(child, fields))
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).filter(([key]) => !fields.has(key)).map(([key, child]) => [key, withoutFields(child, fields)]),
  )
  return value
}

function hasField(value, field) {
  if (!value || typeof value !== 'object') return false
  return Object.hasOwn(value, field) || Object.values(value).some((child) => hasField(child, field))
}

function atPointer(tree, pointer) {
  return pointer.split('/').slice(1).reduce((value, segment) => value?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')], tree)
}

function nodes(value) {
  if (!value || typeof value !== 'object') return []
  return [...(typeof value.type === 'string' ? [value] : []), ...Object.values(value).flatMap(nodes)]
}

function validateExpected(value) {
  for (const node of nodes(value)) {
    if (!validators.has(node.type)) validators.set(node.type, ajv.compile({ $ref: `#/$defs/${node.type}`, $defs: schema.$defs }))
    const validate = validators.get(node.type)
    assert.equal(validate(node), true, JSON.stringify(validate.errors))
    const wraps = node.cellWraps ?? []
    const payload = node.value
    for (const { offset } of wraps) {
      if (offset === 0 || offset === Buffer.byteLength(payload)) continue
      assert.equal(Buffer.from(payload)[offset], 32, `${node.type}.cellWraps offset ${offset}`)
    }
    const offsets = wraps.map(({ offset }) => offset)
    assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b), `${node.type}.cellWraps offsets ascend`)
  }
}

assert.equal(fixtures.version, 2)
for (const fixture of fixtures.rows) {
  test(`atomic inline continuation: ${fixture.id}`, () => {
    validateExpected(fixture.expected)
    const runtime = parse(fixture.source)
    const tree = toAstJson(runtime)
    if (Object.hasOwn(fixture, 'html')) {
      const firstRow = renderHtml(runtime).match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i)
      assert.ok(firstRow, `${fixture.id}: rendered HTML has no table row`)
      assert.ok(firstRow[1].replace(/^\s+/, '').startsWith(fixture.html), `${fixture.id}: first body row does not start with ${fixture.html}`)
    }
    const row = atPointer(tree, '/children/0/children/0/children/0') ?? atPointer(tree, '/children/0/rows/0')
    assert.equal(row.continuationLines, fixture.continuationLines ?? 1)
    if (fixture.id === 'join-between-nodes-takes-a-marker') {
      assert.ok(nodes(row).every((node) => !Object.hasOwn(node, 'cellWraps')))
    }
    const currentPath = atPointer(tree, fixture.path)
    const actual = currentPath
    const expected = fixture.expected
    const compare = () => assert.deepEqual(withoutFields(actual, new Set(['pos'])), withoutFields(expected, new Set(['pos'])))
    if (!Object.hasOwn(fixture, 'aheadOfPin')) return compare()
    const flag = fixture.aheadOfPin
    assert.ok(flag && typeof flag === 'object' && !Array.isArray(flag) &&
      Object.hasOwn(flag, 'missingFields') !== Object.hasOwn(flag, 'pinned'),
    `${fixture.id}: aheadOfPin flag must have exactly one of missingFields or pinned`)
    if (Object.hasOwn(flag, 'pinned')) {
      assert.ok(flag.pinned && typeof flag.pinned === 'object' &&
        typeof flag.reason === 'string' && flag.reason.trim().length > 0,
      `${fixture.id}: aheadOfPin pinned flag needs a node and a reason`)
      assert.deepEqual(withoutFields(actual, new Set(['pos'])), withoutFields(flag.pinned, new Set(['pos'])),
        `${fixture.id}: the pinned engine writes neither the expected tree nor what its aheadOfPin entry says`)
    } else {
      assert.ok(Array.isArray(flag.missingFields) && flag.missingFields.length > 0 &&
        flag.missingFields.every((field) => typeof field === 'string' && field.length > 0),
      `${fixture.id}: aheadOfPin flag must name the missing fields`)
      const fields = flag.missingFields
      for (const field of fields) assert.ok(hasField(expected, field), `${fixture.id}: expected does not contain declared missing field ${field}`)
      for (const field of fields) assert.ok(!hasField(actual, field), `${fixture.id}: the pinned engine emits ${field}, so it is not missing; compare it in full and drop the flag`)
      const omitted = new Set(['pos', ...fields])
      assert.deepEqual(withoutFields(actual, omitted), withoutFields(expected, omitted),
        `${fixture.id}: the pinned engine differs beyond the declared missing fields (${fields})`)
    }
    assert.throws(compare, { code: 'ERR_ASSERTION' }, `${fixture.id} is declared aheadOfPin but the pinned engine passes it: drop the flag`)
  })
}
