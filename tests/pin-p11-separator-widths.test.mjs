import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Ajv2020 } from 'ajv/dist/2020.js'

const schema = JSON.parse(readFileSync(new URL('../resources/ast-schema.json', import.meta.url), 'utf8'))
const validate = new Ajv2020({ strict: true }).compile(schema)
const doc = (widths) => ({
  type: 'document',
  srcByteLength: 0,
  children: [{ type: 'table', rows: [], separatorWidths: widths }],
})

test('CARVE-P11-066 records positive authored separator widths', () => {
  assert.equal(validate(doc([5, 3])), true, JSON.stringify(validate.errors))
  assert.equal(validate(doc([0, 3])), false)
  assert.equal(validate(doc([])), false)
  assert.equal(validate({ type: 'document', srcByteLength: 0, children: [{ type: 'table', rows: [] }] }), true)
})
