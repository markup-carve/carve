/*
 * A comment between a term and its description is that description's first
 * child (carve#5167, CARVE-P12-027). Trees are hand-built so the ruling is
 * pinned whatever the engine pins emit.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { checkPositions } from '../scripts/spec/ast-positions.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const pos = (startOffset, endOffset) => ({ startLine: 1, startColumn: 1, endLine: 1, endColumn: 1, startOffset, endOffset })
const findingsFor = (doc, source) => {
  const findings = []
  checkPositions(doc, source, findings)
  return findings
}
const text = (value, start) => ({ type: 'text', value, pos: pos(start, start + value.length) })
const term = (value, start) => ({ type: 'definition_term', pos: pos(start - 3, start + value.length), children: [text(value, start)] })
const para = (value, start) => ({ type: 'paragraph', pos: pos(start, start + value.length), children: [text(value, start)] })
const list = (end, items) => ({ type: 'document', children: [{ type: 'definition_list', pos: pos(0, end), items }] })

const spanSource = ':: t\n  %%%\n      a\n  %%%\n:  body\n'
const spanTree = (ddPos) => list(32, [
  term('t', 3),
  {
    type: 'definition_description',
    ...(ddPos ? { pos: ddPos } : {}),
    children: [{ type: 'comment', block: true, form: 'block', content: '      a', pos: pos(7, 24) }, para('body', 28)],
  },
])

test('one term: the description starts at the comment it holds', () => {
  assert.deepEqual(findingsFor(spanTree(pos(7, 32)), spanSource), [])
})

test('one term: a description starting at its marker leaves its comment outside', () => {
  assert.deepEqual(findingsFor(spanTree(pos(25, 32)), spanSource), [
    'span outside its parent: "comment" at $.children[0].items[1].children[0] [7, 24] is not inside "definition_description" at $.children[0].items[1] [25, 32]',
  ])
})

const lineSource = ':: t\n%% c\n:: u\n: body\n'
const lineTree = (ddPos) => list(21, [
  term('t', 3),
  term('u', 13),
  {
    type: 'definition_description',
    ...(ddPos ? { pos: ddPos } : {}),
    children: [{ type: 'comment', block: false, form: 'line', content: 'c', pos: pos(5, 9) }, para('body', 17)],
  },
])

test('two terms: the description holding the comment omits pos (CARVE-P12-022)', () => {
  assert.deepEqual(findingsFor(lineTree(null), lineSource), [
    'missing pos on "definition_description" at $.children[0].items[2]',
  ])
})

test('two terms: a span from the comment would run over the second term', () => {
  assert.deepEqual(findingsFor(lineTree(pos(5, 21)), lineSource), [
    'sibling spans overlap at $.children[0].items[1]: "definition_term" starts at 10, inside "definition_description" which ends at 21',
  ])
})

const nestedSource = ':: t\n%% c\n: d\n  - x\n'
const nestedTree = (listStart) => list(19, [
  term('t', 3),
  {
    type: 'definition_description',
    pos: pos(5, 19),
    children: [
      { type: 'comment', block: false, form: 'line', content: 'c', pos: pos(5, 9) },
      para('d', 12),
      { type: 'list', pos: pos(listStart, 19), items: [{ type: 'list_item', pos: pos(listStart, 19), children: [para('x', 18)] }] },
    ],
  },
])

test('a list in such a description is measured from the marker line, not the comment', () => {
  assert.deepEqual(findingsFor(nestedTree(16), nestedSource), [])
  assert.deepEqual(findingsFor(nestedTree(14), nestedSource), [
    'pos does not begin at the markup that opens "list" at $.children[0].items[1].children[2]: offset 14, expected 16 at its owner\'s content column',
    'pos does not begin at the markup that opens "list_item" at $.children[0].items[1].children[2].items[0]: offset 14, expected 16 at its owner\'s content column',
  ])
})

const row = 'a-comment-between-a-term-and-its-description-is-the-description-s-first-block'
for (const suffix of ['', '-2', '-3', '-4', '-5']) {
  test(`corpus 956${suffix}: the written spelling renders as the source does`, () => {
    const read = ext => readFileSync(new URL(`./corpus/956-${row}${suffix}.${ext}`, import.meta.url), 'utf8')
    const html = read('html').trimEnd()
    assert.equal(renderDoc(parse(read('crv'))).trimEnd(), html)
    assert.equal(renderDoc(parse(read('fmt'))).trimEnd(), html)
  })
}
