import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, resolve, toAstJson } from '@markup-carve/carve'

const tree = source => toAstJson(resolve(parse(source)))

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
