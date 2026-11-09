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

test('CARVE-P12-049 carries block content in place of inline cell content', () => {
  const cell = { type: 'table_cell', header: false, blocks: [
    { type: 'paragraph', children: [{ type: 'text', value: 'body' }] },
  ] }
  const table = { type: 'table', rows: [{ type: 'table_row', cells: [cell] }] }
  assert.equal(validate(doc(table)), true, JSON.stringify(validate.errors))
  assert.equal(validate(doc({ ...table, rows: [{ type: 'table_row', cells: [
    { ...cell, children: [{ type: 'text', value: 'duplicate' }] },
  ] }] })), false)
})

test('CARVE-P12-052 keeps a section as a block wrapper on interchange', () => {
  const section = { type: 'section', level: 2, children: [
    { type: 'heading', level: 2, children: [{ type: 'text', value: 'A' }] },
  ] }
  assert.equal(validate(doc(section)), true, JSON.stringify(validate.errors))
  assert.equal(validate(doc({ ...section, children: [{ type: 'text', value: 'A' }] })), false)
})

test('CARVE-P12-047 requires the target field on every reference node', () => {
  const paragraph = children => ({ type: 'paragraph', children })
  const cases = [
    [{ type: 'link', href: '/x', children: [] }, 'href'],
    [{ type: 'image', src: 'x.png', alt: 'x' }, 'src'],
    [{ type: 'heading_ref', target: 'heading' }, 'target'],
    [{ type: 'footnote_ref', label: 'note' }, 'label'],
  ]
  for (const [node, field] of cases) {
    const wrapped = doc(paragraph([node]))
    assert.equal(validate(wrapped), true, `${node.type}: ${JSON.stringify(validate.errors)}`)
    const { [field]: _removed, ...withoutTarget } = node
    assert.equal(validate(doc(paragraph([withoutTarget]))), false, `${node.type} without ${field}`)
  }
})
