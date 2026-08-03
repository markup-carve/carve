/*
 * The position rules behind scripts/ast-conformance.mjs.
 *
 * They lived inside the report, which needs sibling engine checkouts and exits
 * the process, so no test could reach them. That mattered: the report compares
 * a span against the text it covers only for `text` nodes - the one node whose
 * source text the AST knows - and so a paragraph, list item, table cell or
 * block quote could point at the wrong source and the run came back clean.
 * carve-php did exactly that on a tab-containing line block for the whole life
 * of the checker (markup-carve/carve-php#669, carve#541).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@markup-carve/carve'
import { checkPositions, walkNodes } from '../scripts/spec/ast-positions.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

/** A node's span, spelled out, so a test can state the defect it means. */
function pos(startOffset, endOffset) {
  return {
    startLine: 1,
    startColumn: 1,
    endLine: 1,
    endColumn: 1,
    startOffset,
    endOffset,
  }
}

const findingsFor = (doc, source) => {
  const findings = []
  checkPositions(doc, source, findings)
  return findings
}

test('a paragraph whose span starts on the newline before it is reported', () => {
  // The php shape: the paragraph begins at the terminator of the line above,
  // so its own first line is outside its span. Nothing about the node's value
  // is needed to know that is wrong.
  const source = 'first\nsecond\n'
  const doc = {
    type: 'document',
    children: [{ type: 'paragraph', pos: pos(5, 12), children: [] }],
  }
  const findings = findingsFor(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /starts on a line terminator on "paragraph"/)
})

test('a break may start on a newline, because the newline is what it is', () => {
  const source = 'a\nb\n'
  const doc = {
    type: 'document',
    children: [
      { type: 'soft_break', pos: pos(1, 2) },
      { type: 'hard_break', pos: pos(1, 2) },
    ],
  }
  assert.deepEqual(findingsFor(doc, source), [])
})

test('an empty span at the very end of the source is not read as a newline', () => {
  // startOffset === length indexes past the end; reading it as a terminator
  // would report every zero-width span at EOF.
  const source = 'a\n'
  const doc = {
    type: 'document',
    children: [{ type: 'paragraph', pos: pos(2, 2), children: [] }],
  }
  assert.deepEqual(findingsFor(doc, source), [])
})

test('a hard break that starts after its backslash is reported', () => {
  const source = 'a\\\nb\n'
  const doc = {
    type: 'document',
    children: [{ type: 'hard_break', pos: pos(2, 3) }],
  }
  const findings = findingsFor(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /hard break span starts after its backslash/)
})

test('a hard break covering the backslash and the newline is accepted', () => {
  const source = 'a\\\nb\n'
  const doc = {
    type: 'document',
    children: [{ type: 'hard_break', pos: pos(1, 3) }],
  }
  assert.deepEqual(findingsFor(doc, source), [])
})

test('a synthesized break over a bare newline is accepted', () => {
  // A line block's implied break, or a hard-break fence turning every newline
  // into one: no backslash was written, so the newline IS the construct.
  const source = 'a\nb\n'
  const doc = {
    type: 'document',
    children: [{ type: 'hard_break', pos: pos(1, 2) }],
  }
  assert.deepEqual(findingsFor(doc, source), [])
})

test('a text node whose span selects the wrong source is reported', () => {
  const source = 'hello world\n'
  const doc = {
    type: 'document',
    children: [{ type: 'text', value: 'hello', pos: pos(6, 11) }],
  }
  const findings = findingsFor(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /does not cover the text it belongs to/)
})

test('a child whose span leaves its parent is reported', () => {
  const source = '- one\n\n  second\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'list',
        pos: pos(0, 15),
        items: [
          {
            type: 'list_item',
            pos: pos(0, 5),
            children: [{ type: 'paragraph', pos: pos(9, 15), children: [] }],
          },
        ],
      },
    ],
  }
  const findings = findingsFor(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /span outside its parent: "paragraph"/)
})

test('a parent that covers its children is accepted', () => {
  const source = '- one\n\n  second\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'list_item',
        pos: pos(0, 15),
        children: [{ type: 'paragraph', pos: pos(9, 15), children: [] }],
      },
    ],
  }
  assert.deepEqual(findingsFor(doc, source), [])
})

test('an unplaced node is skipped, and its parent still bounds the grandchild', () => {
  // PART 12 §4 lets a reassembled node omit `pos`. Comparing against the
  // nearest PLACED ancestor keeps the rule alive across that gap instead of
  // going quiet exactly where a span is most likely wrong.
  const source = 'ab\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'table',
        pos: pos(0, 2),
        rows: [{ type: 'table_row', children: [{ type: 'text', value: 'x', pos: pos(0, 3) }] }],
      },
    ],
  }
  const findings = findingsFor(doc, source)
  assert.ok(
    findings.some((f) => /span outside its parent: "text"/.test(f)),
    findings.join('\n'),
  )
})

test('a missing pos is reported on every node but the root', () => {
  const doc = { type: 'document', children: [{ type: 'paragraph', children: [] }] }
  const findings = findingsFor(doc, 'x\n')
  assert.deepEqual(findings, ['missing pos on "paragraph" at $.children[0]'])
})

test('no corpus document has a span starting on a line terminator', () => {
  // The synthetic documents above prove the rule fires; this proves it does not
  // fire on a real one. A rule that reports a well-formed document is worse
  // than no rule: it is the reason a report gets ignored. The rule found one
  // paragraph in 535 documents when it was written, in carve-php, and that one
  // is fixed - so this is now a ratchet.
  //
  // The rest of the findings are NOT asserted away: every one is the known
  // missing-pos gap in this engine (carve#534), and anything that is not that
  // fails here rather than waiting for someone to read a report.
  const dir = resolve(repo, 'tests/corpus')
  const cases = readdirSync(dir).filter((name) => name.endsWith('.crv'))
  for (const name of cases) {
    const source = readFileSync(resolve(dir, name), 'utf8')
    const findings = findingsFor(parse(source), source)
    const unexpected = findings.filter((f) => !f.startsWith('missing pos on '))
    assert.deepEqual(unexpected, [], `${name}\n${unexpected.join('\n')}`)
  }
  assert.ok(cases.length > 400, `only ${cases.length} corpus documents reached the rules`)
})

test('walkNodes yields every typed node and descends arrays of arrays', () => {
  const doc = {
    type: 'document',
    children: [
      {
        type: 'definition_list',
        items: [[{ type: 'definition_term' }, { type: 'definition_description' }]],
      },
    ],
  }
  const types = [...walkNodes(doc)].map(([node]) => node.type)
  assert.deepEqual(types, [
    'document',
    'definition_list',
    'definition_term',
    'definition_description',
  ])
})
