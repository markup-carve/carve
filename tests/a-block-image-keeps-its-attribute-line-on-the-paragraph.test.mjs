/*
 * Promotion moves no attributes (carve#5039, ruling A; PART 12 §23): a block
 * attribute line above a promoted image stays in `paragraph.attrs`, and the
 * image keeps only the definition's and the use site's attributes.
 *
 * The engine check is `todo` until the carve-js pin publishes the ruled shape.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { parse, toAstJson } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(resolve(root, 'resources/ast-schema.json'), 'utf8'))
const clause = readFileSync(resolve(root, 'resources/spec/25-ast-extensions.ebnf'), 'utf8')
const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema)

const source = '{.c}\n![a][ex]\n\n[ex]: /i.png {.wide}\n'
const ruled = {
  type: 'paragraph',
  blockImage: true,
  attrs: { classes: ['c'] },
  children: [{ type: 'image', src: '/i.png', alt: 'a', ref: 'ex', rawRef: '![a][ex]', attrs: { classes: ['wide'] } }],
}

test('the clause states that promotion moves no attributes', () => {
  assert.match(clause, /PROMOTION MOVES NO ATTRIBUTES/)
})

test('the schema accepts a block image whose paragraph keeps its attribute line', () => {
  assert.equal(validate({ type: 'document', srcByteLength: source.length, children: [ruled] }), true, JSON.stringify(validate.errors))
})

test('a parse keeps the attribute line on the paragraph', { todo: 'carve-js pin moves the line onto the image (carve#5039)' }, () => {
  const node = toAstJson(parse(source)).children[0]
  assert.equal(node.blockImage, true)
  assert.deepEqual(node.attrs?.classes, ['c'])
  assert.deepEqual(node.children[0].attrs?.classes, ['wide'])
})
