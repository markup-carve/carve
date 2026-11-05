/*
 * An erased `%%` line is a child of the innermost container whose content
 * column it reaches, else the document (carve#5178, CARVE-P0-005). Trees are
 * hand-built so the ruling is pinned whatever the engine pins emit.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { checkPositions } from '../scripts/spec/ast-positions.mjs'

const pos = (startOffset, endOffset) => ({ startLine: 1, startColumn: 1, endLine: 1, endColumn: 1, startOffset, endOffset })
const findingsFor = (doc, source) => {
  const findings = []
  checkPositions(doc, source, findings)
  return findings
}
const corpus = (name) => readFileSync(new URL(`./corpus/${name}.crv`, import.meta.url), 'utf8')
const text = (value, start) => ({ type: 'text', value, pos: pos(start, start + value.length) })
const para = (value, start) => ({ type: 'paragraph', pos: pos(start, start + value.length), children: [text(value, start)] })
const term = (value, start) => ({ type: 'definition_term', pos: pos(start - 3, start + value.length), children: [text(value, start)] })
const comment = (content, start, end) => ({ type: 'comment', block: false, form: 'line', content, pos: pos(start, end) })
const item = (start, end, children) => ({ type: 'list_item', pos: pos(start, end), children })
const list = (start, end, tight, items) => ({ type: 'list', ordered: false, tight, ...(start === null ? {} : { pos: pos(start, end) }), items })

function parentOf(node, type, path = '$') {
  for (const [key, value] of Object.entries(node)) {
    if (!Array.isArray(value)) continue
    for (const [i, child] of value.entries()) {
      if (child?.type === type) return path
      const found = child && typeof child === 'object' ? parentOf(child, type, `${path}.${key}[${i}]`) : null
      if (found) return found
    }
  }
  return null
}

test('the simple case: a comment at the item column is the item\'s', () => {
  const source = '- a\n\n  %% n\n- b\n'
  const doc = { type: 'document', children: [list(0, 15, false, [item(0, 11, [para('a', 2), comment('n', 7, 11)]), item(12, 15, [para('b', 14)])])] }
  assert.equal(parentOf(doc, 'comment'), '$.children[0].items[0]')
  assert.deepEqual(findingsFor(doc, source), [])
})

const s620 = '- - a\n\n  %% just a note\n- b\n'
const tree620 = (outerEnd) => ({
  type: 'document',
  children: [
    list(0, 27, false, [
      item(0, outerEnd, [list(2, 5, true, [item(2, 5, [para('a', 4)])]), comment('just a note', 9, 23)]),
      item(24, 27, [para('b', 26)]),
    ]),
  ],
})

test('corpus 620-14: a comment at the outer item column is the outer item\'s, after the nested list', () => {
  assert.equal(corpus('620-generated-container-documents-14'), s620)
  assert.equal(parentOf(tree620(23), 'comment'), '$.children[0].items[0]')
  assert.deepEqual(findingsFor(tree620(23), s620), [])
  assert.deepEqual(findingsFor(tree620(5), s620), [
    'span outside its parent: "comment" at $.children[0].items[0].children[1] [9, 23] is not inside "list_item" at $.children[0].items[0] [0, 5]',
  ])
})

test('corpus 504-18: a comment at the description column is the description\'s, between the nested list and the paragraph', () => {
  const source = ':: a\n: b\n  :: c\n  %% note\n  more\n'
  assert.equal(corpus('504-a-comment-or-a-definition-under-a-definition-term-folds-at-every-depth-18'), source)
  const doc = {
    type: 'document',
    children: [
      {
        type: 'definition_list',
        pos: pos(0, 32),
        items: [
          term('a', 3),
          {
            type: 'definition_description',
            pos: pos(5, 32),
            children: [
              para('b', 7),
              { type: 'definition_list', pos: pos(11, 15), items: [term('c', 14)] },
              comment('note', 18, 25),
              para('more', 28),
            ],
          },
        ],
      },
    ],
  }
  assert.equal(parentOf(doc, 'comment'), '$.children[0].items[1]')
  assert.deepEqual(findingsFor(doc, source), [])
})

const s937 = '- :: term\n  : payload\n\n    %% c\n- sub\n'
const tree937 = (listStart) => ({
  type: 'document',
  children: [
    list(listStart, 37, false, [
      item(0, 31, [
        {
          type: 'definition_list',
          pos: pos(2, 31),
          items: [
            term('term', 5),
            { type: 'definition_description', pos: pos(12, 31), children: [para('payload', 14), comment('c', 27, 31)] },
          ],
        },
      ]),
      item(32, 37, [para('sub', 34)]),
    ]),
  ],
})

test('corpus 937: the description holds the comment, so the list contains it and keeps pos', () => {
  assert.equal(corpus('937-a-blank-before-only-invisible-lines-loosens-the-list'), s937)
  assert.equal(parentOf(tree937(0), 'comment'), '$.children[0].items[0].children[0].items[1]')
  assert.deepEqual(findingsFor(tree937(0), s937), [])
  assert.deepEqual(findingsFor(tree937(null), s937), ['missing pos on "list" at $.children[0]'])
})
