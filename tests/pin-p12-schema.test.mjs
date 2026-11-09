import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Ajv2020 } from 'ajv/dist/2020.js'

const schema = JSON.parse(readFileSync(new URL('../resources/ast-schema.json', import.meta.url), 'utf8'))
const validate = new Ajv2020({ strict: true }).compile(schema)
const doc = child => ({ type: 'document', srcByteLength: 0, children: [child] })

test('CARVE-P12-035 uses figure_group for a composite figure', () => {
  const panel = { type: 'figure', target: { type: 'image', src: 'x.png', alt: 'x' }, caption: [] }
  const group = { type: 'figure_group', children: [panel] }
  assert.equal(validate(doc(group)), true, JSON.stringify(validate.errors))
  assert.equal(validate(doc({ ...group, target: panel.target })), false)
})

test('CARVE-P12-055 requires a core block fallback for a block extension', () => {
  const extension = {
    type: 'block_extension', name: 'org.example.diagram',
    fallback: { type: 'paragraph', children: [{ type: 'text', value: 'diagram' }] },
  }
  assert.equal(validate(doc(extension)), true, JSON.stringify(validate.errors))
  const { fallback, ...missingFallback } = extension
  assert.equal(validate(doc(missingFallback)), false)
  assert.equal(validate(doc({ ...extension, fallback: { type: 'text', value: 'wrong kind' } })), false)
})
