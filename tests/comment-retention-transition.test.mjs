import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse as engineParse, toAstJson } from '@markup-carve/carve'
import { afterCommentTransition, parse } from '../scripts/spec/layout.mjs'
import { miscount } from '../scripts/spec/participants.mjs'

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/comment-retention-transitions.json', import.meta.url)))
const plain = value => JSON.parse(JSON.stringify(value, (_, v) =>
  v instanceof Map ? { map: [...v] } : v instanceof Set ? { set: [...v] } : v))

const transitions = [
  ['below-column closer inside an opaque span', { belowCloser: true, inCommentSpan: true }, true, true],
  ['below-column span closer', { belowCloser: true }, true, true],
  ['ordinary span closer', { spanClosed: true }, true, true],
  ['marker-line span closer', { spanClosed: true, markerLine: true }, false, true],
  ['opaque payload', { inCommentSpan: true }, false, true],
  ['delimiter inside an opaque span', { inCommentSpan: true, comment: true }, false, true],
  ['line comment or unmatched fence', { comment: true }, true, true],
  ['blank', { blank: true }, false, true],
  ['ordinary content', {}, false, false],
]
for (const [name, facts, fromFalse, fromTrue] of transitions) {
  test(`after-comment transition: ${name}`, () => {
    assert.equal(afterCommentTransition(false, facts), fromFalse)
    assert.equal(afterCommentTransition(true, facts), fromTrue)
  })
}

test('the reviewed comment transition bank has sixteen cases and four public AST controls', () => {
  assert.equal(miscount({ label: 'comment transition fixtures', actual: fixtures.length, expected: 16 }), null)
  assert.equal(miscount({ label: 'public comment AST controls', actual: fixtures.filter(row => row.publicAst).length, expected: 4 }), null)
})

function outline(node) {
  return {
    type: node.type,
    ...(node.content !== undefined ? { content: node.content } : {}),
    ...(node.value !== undefined ? { value: node.value } : {}),
    ...(node.block !== undefined ? { block: node.block } : {}),
    ...(node.type === 'comment' ? { pos: node.pos } : {}),
    ...(node.children ? { children: node.children.map(outline) } : {}),
    ...(node.items ? { items: node.items.map(outline) } : {}),
  }
}

for (const { source, checker, publicAst } of fixtures) {
  test(`comment transition structure: ${JSON.stringify(source)}`, () => {
    assert.deepEqual(plain(parse(source)), checker)
    if (publicAst) assert.deepEqual(outline(toAstJson(engineParse(source))), publicAst)
  })
}
