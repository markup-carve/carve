import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { Ajv2020 } from 'ajv/dist/2020.js'

const schema = JSON.parse(readFileSync(new URL('../resources/ast-schema.json', import.meta.url), 'utf8'))
const validate = new Ajv2020({ strict: false }).compile(schema)
const document = children => ({ type: 'document', srcByteLength: 0, children: [{ type: 'paragraph', children }] })

test('generated spaces are distinct from literal Unicode on the wire', () => {
  const ast = document([{ type: 'text', value: 'a\ue000' }, { type: 'non_breaking_space' }, { type: 'text', value: '\u00a0b' }])
  assert.equal(validate(ast), true, JSON.stringify(validate.errors))
  assert.equal(ast.children[0].children[0].value, 'a\ue000')
})

test('a generated space is a closed inline leaf', () => {
  for (const field of ['value', 'count', 'children']) {
    assert.equal(validate(document([{ type: 'non_breaking_space', [field]: field === 'children' ? [] : 2 }])), false)
  }
  assert.equal(validate({ type: 'document', srcByteLength: 0, children: [{ type: 'non_breaking_space' }] }), false)
})

test('text and verbatim fields document literal Unicode', () => {
  for (const [type, field] of [['text', 'value'], ['code', 'value'], ['code_block', 'content'], ['literal_inline', 'content']]) {
    assert.match(schema.$defs[type].properties[field].description, /literal|Literal/)
    assert.doesNotMatch(schema.$defs[type].properties[field].description, /May contain U\+E000/)
  }
})

const engine = await import('@markup-carve/carve')
const legacyEngine = !engine.carveToAstJson('a\\ b\n').children[0].children.some(node => node.type === 'non_breaking_space')

test('the pinned engine identifies its whitespace contract', () => {
  const ast = engine.carveToAstJson('a\\ b\n')
  const types = ast.children[0].children.map(node => node.type)
  if (legacyEngine) {
    assert.deepEqual(types, ['text'])
    assert.equal(ast.children[0].children[0].value, 'a\ue000b')
  } else {
    assert.deepEqual(types, ['text', 'non_breaking_space', 'text'])
  }
})

test('updated engines pass the shared annotation projection fixture', {
  skip: legacyEngine ? 'Pending the coordinated engine PRs: the package pin still emits whitespace markers.' : false,
}, () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/annotation-projection.json', import.meta.url), 'utf8'))
  assert.equal([...fixture.projection].length, 11)
  for (const [key, accepted] of [['valid', true], ['invalid', false]]) {
    for (const range of fixture[key]) {
      const read = () => engine.readAnnotationRanges({ version: 1, ranges: [{ id: 'r', kind: 'test', ...range }] }, fixture.document)
      if (accepted) assert.doesNotThrow(read)
      else assert.throws(read)
    }
  }
})

/*
 * The two controls. Every test above reads the schema or a hand-built tree, so
 * without these the file passes by restating its own model: nothing checks that
 * an authored private-use character survives to the output, and nothing looks at
 * a document the probes did not think of.
 */

/** Passthrough control: raw content is handed to its target byte for byte. */
test('a raw block passes an authored private-use character through untouched', () => {
  const html = engine.carveToHtml('```=html\n<i>a\ue000b</i>\n```\n')
  assert.ok(html.includes('\ue000'), `raw passthrough rewrote the character: ${JSON.stringify(html)}`)
})

/** Every string value in a serialized tree that holds U+E000. */
function valuesHoldingE000(node, found = []) {
  if (Array.isArray(node)) {
    for (const child of node) valuesHoldingE000(child, found)
    return found
  }
  if (!node || typeof node !== 'object') return found
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string') {
      if (value.includes('\ue000')) found.push(`${node.type}.${key}`)
    } else {
      valuesHoldingE000(value, found)
    }
  }
  return found
}

/** Coverage control: the probes pin only the sources someone thought of. */
test('no corpus document publishes U+E000 its own source does not contain', {
  skip: legacyEngine ? 'the package pin still spells generated spaces as U+E000 in a value' : false,
}, () => {
  const dir = new URL('./corpus/', import.meta.url)
  const names = readdirSync(dir).filter(name => name.endsWith('.crv')).sort()
  assert.ok(names.length >= 10, `found ${names.length} corpus documents`)
  const invented = []
  for (const name of names) {
    const source = readFileSync(new URL(name, dir), 'utf8')
    if (source.includes('\ue000')) continue
    for (const field of valuesHoldingE000(engine.carveToAstJson(source))) invented.push(`${field} (${name})`)
  }
  assert.deepEqual(invented, [], 'a published value holds U+E000 that no source character explains')
})
