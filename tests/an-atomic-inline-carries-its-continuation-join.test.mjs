import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { parse } from '@markup-carve/carve'

const fixtures = JSON.parse(readFileSync(new URL('../resources/ast-cell-wraps-acceptance.json', import.meta.url), 'utf8'))
const schema = JSON.parse(readFileSync(new URL('../resources/ast-schema.json', import.meta.url), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: true })
const validators = new Map()

function withoutPos(value) {
  if (Array.isArray(value)) return value.map(withoutPos)
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== 'pos').map(([key, child]) => [key, withoutPos(child)]),
  )
  return value
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
    const payload = node.type === 'code' ? node.value : node.content
    for (const { offset } of wraps) assert.equal([...payload][offset], ' ', `${node.type}.cellWraps offset ${offset}`)
    const offsets = wraps.map(({ offset }) => offset)
    assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b), `${node.type}.cellWraps offsets ascend`)
  }
}

assert.equal(fixtures.version, 1)
for (const fixture of fixtures.rows) {
  test(`atomic inline continuation: ${fixture.id}`, () => {
    validateExpected(fixture.expected)
    const tree = parse(fixture.source)
    const row = atPointer(tree, '/children/0/rows/0')
    assert.equal(row.continuationLines, fixture.continuationLines ?? 1)
    if (fixture.id === 'join-between-nodes-takes-a-marker') {
      assert.ok(nodes(row).every((node) => !Object.hasOwn(node, 'cellWraps')))
    }
    const body = () => assert.deepEqual(withoutPos(atPointer(tree, fixture.path)), fixture.expected)
    if (!fixture.aheadOfPin) return body()
    assert.throws(body, undefined, `${fixture.id} is declared aheadOfPin but the pinned engine passes it: drop the flag`)
  })
}
