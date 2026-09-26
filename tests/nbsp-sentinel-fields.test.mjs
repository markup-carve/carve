import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
const legacyEngine = engine.AST_CONTRACT_VERSION === undefined || engine.AST_CONTRACT_VERSION.startsWith('1.')

test('the pinned engine identifies its whitespace contract', () => {
  const ast = engine.carveToAstJson('a\\ b\n')
  const types = ast.children[0].children.map(node => node.type)
  if (legacyEngine) {
    assert.deepEqual(types, ['text'])
    assert.equal(ast.children[0].children[0].value, 'a\ue000b')
  } else {
    assert.deepEqual(types, ['text', 'non_breaking_space', 'text'])
    assert.equal(engine.AST_CONTRACT_VERSION, '2.0')
  }
})

test('contract 2.0 engines pass the shared annotation projection fixture', {
  skip: legacyEngine ? 'Pending the coordinated engine PRs: the package pin implements AST contract 1.x.' : false,
}, () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/annotation-projection-v2.json', import.meta.url), 'utf8'))
  assert.equal([...fixture.projection].length, 11)
  for (const [key, accepted] of [['valid', true], ['invalid', false]]) {
    for (const range of fixture[key]) {
      const read = () => engine.readAnnotationRanges({ version: 1, ranges: [{ id: 'r', kind: 'test', ...range }] }, fixture.document)
      if (accepted) assert.doesNotThrow(read)
      else assert.throws(read)
    }
  }
})
