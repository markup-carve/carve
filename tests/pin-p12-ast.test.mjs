import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AstJsonDepthError, MAX_AST_JSON_DEPTH, fromAstJson, parse, resolve, toAstJson } from '@markup-carve/carve'

const tree = source => toAstJson(resolve(parse(source)))

test('CARVE-P12-005 and CARVE-P12-023 retain authored fields beside resolution results', () => {
  const source = '# A\n\n[x][r]\n\n[r]: /target\n'
  const parsed = toAstJson(parse(source))
  const resolved = tree(source)
  assert.equal(parsed.children[0].attrs?.id, undefined)
  assert.equal(resolved.children[0].attrs.id, 'A')
  assert.equal(parsed.children[1].children[0].ref, 'r')
  assert.equal(parsed.children[1].children[0].rawRef, '[x][r]')
  assert.equal(resolved.children[1].children[0].href, '/target')
  assert.equal(resolved.children[1].children[0].ref, 'r')
  assert.equal(resolved.children[1].children[0].rawRef, '[x][r]')
})

test('CARVE-P12-002 keeps one text run and separates an escaped character', () => {
  const assembled = toAstJson(resolve({
    type: 'document',
    children: [{ type: 'paragraph', children: [
      { type: 'text', value: 'a' }, { type: 'text', value: ' b' },
    ] }],
  })).children[0].children
  assert.deepEqual(assembled.map(({ type, value }) => [type, value]), [['text', 'a b']])
  const plain = tree('a  b\n').children[0].children
  assert.deepEqual(plain.map(({ type, value }) => [type, value]), [['text', 'a  b']])
  const escaped = tree('a\\-b\n').children[0].children
  assert.deepEqual(escaped.map(({ type, value }) => [type, value]), [
    ['text', 'a'], ['escaped_text', '-'], ['text', 'b'],
  ])
})

test('CARVE-P12-004 represents an authored nonbreaking space as a node', () => {
  const children = tree('a\\ b\n').children[0].children
  assert.deepEqual(children.map(({ type }) => type), ['text', 'non_breaking_space', 'text'])
  assert.equal(children[1].pos.startOffset, 1)
  assert.equal(children[1].pos.endOffset, 3)
})

test('CARVE-P12-007 preserves a nested link as an AST node', () => {
  const outer = tree('[[x](y)](z)\n').children[0].children[0]
  assert.equal(outer.type, 'link')
  assert.equal(outer.href, 'z')
  assert.equal(outer.children[0].type, 'link')
  assert.equal(outer.children[0].href, 'y')
})

test('CARVE-P12-010 keeps a resolved cross-reference as a heading reference', () => {
  const children = tree('# A\n\nSee </#A>\n').children[1].children
  const reference = children[1]
  assert.equal(reference.type, 'heading_ref')
  assert.equal(reference.target, 'A')
})

test('CARVE-P12-069 publishes each continuation marker in its joined cell', () => {
  const table = tree('| a | b |\n+ more |\n').children[0]
  const row = table.rows[0]
  const cell = row.cells[0]
  assert.equal(row.continuationLines, 1)
  assert.deepEqual(cell.children.map(({ type }) => type), ['text', 'cell_wrap', 'text'])
  assert.equal(cell.children[1].line, 1)
  assert.equal(cell.children[1].pos.startOffset, 10)
})

test('CARVE-P12-028 and CARVE-P12-068 refuse excess depth with a typed error', () => {
  const document = { type: 'document', srcByteLength: 0, children: [] }
  let parent = document
  for (let depth = 0; depth <= MAX_AST_JSON_DEPTH; depth++) {
    const child = { type: 'div', children: [] }
    parent.children = [child]
    parent = child
  }
  assert.throws(() => fromAstJson(document), error =>
    error instanceof AstJsonDepthError && error.depth > MAX_AST_JSON_DEPTH)
})

test('CARVE-P12-041 replaces NUL in ingested string values', () => {
  const document = { type: 'document', srcByteLength: 3, children: [
    { type: 'paragraph', children: [{ type: 'text', value: 'a\u0000b' }] },
  ] }
  const decoded = fromAstJson(document)
  assert.equal(toAstJson(decoded).children[0].children[0].value, 'a\uFFFDb')
})

test('CARVE-P12-044 retains an ingested blockImage value', () => {
  const document = { type: 'document', srcByteLength: 0, children: [
    { type: 'paragraph', blockImage: true, children: [
      { type: 'image', src: 'x.png', alt: 'x' }, { type: 'text', value: 'tail' },
    ] },
  ] }
  assert.equal(toAstJson(fromAstJson(document)).children[0].blockImage, true)
})
