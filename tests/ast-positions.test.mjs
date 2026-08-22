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
import { replaceNulls } from '../scripts/spec/layout.mjs'
import {
  HOISTED_DEFINITION_TYPES,
  OPENING_MARKUP,
  checkContainment,
  checkOpeningMarkup,
  checkPositions,
  walkNodes,
} from '../scripts/spec/ast-positions.mjs'

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

test('a child that STARTS before its parent is reported', () => {
  // The other direction, pinned on its own. Containment is two comparisons, and
  // every case above violates BOTH - so disabling the start-side one changed
  // nothing any test could see. Found by mutating the predicate (carve#913):
  // the mutant survived, which is the definition of an unpinned rule.
  const source = '- one\n\n  second\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'list_item',
        pos: pos(6, 15),
        children: [{ type: 'paragraph', pos: pos(2, 15), children: [] }],
      },
    ],
  }
  const findings = findingsFor(doc, source)
  assert.ok(
    findings.some((f) => /span outside its parent: "paragraph"/.test(f)),
    findings.join('\n'),
  )
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
    const raw = readFileSync(resolve(dir, name), 'utf8')
    // PART 0 INPUT replaces every U+0000 with U+FFFD before the first line is
    // read, one codepoint for one, so the node's text holds the replacement
    // where the fixture holds the byte. Slicing the raw fixture reported the
    // NUL corpus document as a bad span while every offset in it was right
    // (carve#1523). Only this transform is applied: the BOM strip and the
    // line-ending fold change LENGTH, and the engines report positions against
    // the source as it arrived, so applying those would move every offset in a
    // CRLF or BOM'd document (carve#876).
    const source = replaceNulls(raw)
    const findings = findingsFor(parse(raw), source)
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

function span(startOffset, endOffset) {
  return { startLine: 1, endLine: 1, startColumn: 1, endColumn: 1, startOffset, endOffset }
}

// The rule PART 12 §4's discontiguous-node clause needs enforcing: a node whose
// content sits on non-adjacent lines carries the span of its FIRST FRAGMENT,
// and first-offset-to-last-offset is forbidden because it swallows whatever
// sits between the fragments. Built as a synthetic tree, because no engine
// currently publishes the forbidden shape - which is exactly why a check for it
// has to be written before one does.
test('a first-to-last span over a sibling is a finding', () => {
  const doc = {
    type: 'document',
    children: [
      {
        type: 'table_row',
        children: [
          // The continued cell, spanning from its first fragment to its last.
          { type: 'table_cell', pos: span(0, 60), children: [] },
          // The sibling it swallows.
          { type: 'table_cell', pos: span(20, 30), children: [] },
        ],
      },
    ],
  }
  const findings = []
  checkPositions(doc, 'x'.repeat(60), findings)
  assert.equal(
    findings.filter((f) => f.includes('sibling spans overlap')).length,
    1,
    `expected one overlap finding, got: ${JSON.stringify(findings)}`,
  )
})

// EVERY hoisted kind, not just one. The exemption held `footnote` and
// `abbreviation_def` for a while after PART 12 §10 added
// `link_reference_definition`, which hoists the same way - and this checker then
// reported a §4 sibling overlap for carve-php, the only engine that implements
// the node, on every definition authored inside a container. A test naming one
// kind could not fail on that.
for (const type of HOISTED_DEFINITION_TYPES) {
  test(`a hoisted ${type} inside a container is not an overlap`, () => {
    // PART 12 §7: the definition is a document-level sibling of the div it was
    // written in, and its pos still points inside that div.
    const doc = {
      type: 'document',
      children: [
        { type: 'div', pos: span(0, 48), children: [] },
        { type, pos: span(4, 20), children: [] },
      ],
    }
    const findings = []
    checkPositions(doc, 'x'.repeat(60), findings)
    assert.deepEqual(
      findings.filter((f) => f.includes('sibling spans overlap')),
      [],
    )
  })
}

test('every definition kind the schema hoists is exempt from the overlap rule', () => {
  // The rule lives in the schema's own words ("Hoisted to the document") and in
  // PART 12 §7 and §10. Deriving the check from the schema means the next
  // definition kind cannot ship with the exemption list left behind - which is
  // exactly what happened to `link_reference_definition`.
  const schema = JSON.parse(readFileSync(resolve(repo, 'resources/ast-schema.json'), 'utf8'))
  const hoisted = Object.entries(schema.$defs)
    .filter(([, def]) => /hoisted to the document/i.test(def.description ?? ''))
    .map(([name]) => name)
  const missing = hoisted.filter((type) => !HOISTED_DEFINITION_TYPES.has(type))
  assert.deepEqual(
    missing,
    [],
    `the schema says these hoist, and the overlap rule does not exempt them: ${missing.join(', ')}`,
  )
})

/*
 * A SPAN BEGINS AT THE CONSTRUCT'S OPENING MARKUP (PART 12 section 4,
 * carve#913).
 *
 * The ruling this enforces: `pos` covers the construct as WRITTEN, so it
 * round-trips to the source that produced the node. The trap it must not
 * repeat is one module over - the checker's only content-level rule asserted
 * that a span SLICES TO plausible text, and both sides of a real divergence
 * pass that: carve-php's `[0, 1]` and the other two's `[4, 5]` over `* * *`
 * both slice to an asterisk. So these compare the OFFSET against the source at
 * it, never against what the node says it holds.
 */

test('a span that starts at the content rather than the marker is reported', () => {
  const source = '> q\n'
  const doc = {
    type: 'document',
    children: [{ type: 'block_quote', pos: pos(2, 3), children: [] }],
  }
  const findings = findingsFor(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /does not begin at the markup that opens "block_quote"/)
})

test('the same quote spanning its marker is accepted', () => {
  // The pair matters: the rule above has to be the reason the finding appears,
  // not the document.
  const source = '> q\n'
  const doc = {
    type: 'document',
    children: [{ type: 'block_quote', pos: pos(0, 3), children: [] }],
  }
  assert.deepEqual(findingsFor(doc, source), [])
})

test('the indentation before a nested marker is inside the item, not outside it', () => {
  const source = '  - a\n'
  const placed = {
    type: 'document',
    children: [{ type: 'list_item', pos: pos(0, 5), children: [] }],
  }
  assert.deepEqual(findingsFor(placed, source), [])

  // And an item that began at its own content is still reported, so the
  // allowance is for indentation and not for everything before the marker.
  const contentOnly = {
    type: 'document',
    children: [{ type: 'list_item', pos: pos(4, 5), children: [] }],
  }
  assert.match(
    findingsFor(contentOnly, source).join('\n'),
    /does not begin at the markup that opens "list_item"/,
  )
})

test('a table cell is not asked to begin at a pipe', () => {
  // PART 12 section 4's own worked example gives the first body cell the span
  // of " Fresh Fruits    " - between the pipes. The `|` opens the ROW, and a
  // cell claiming it would overlap the cell before it, which the sibling
  // overlap rule forbids. So the exception is stated in the table rather than
  // left for a reader to infer from silence.
  assert.equal(OPENING_MARKUP.has('table_cell'), false)
  assert.equal(OPENING_MARKUP.has('table_row'), false)
  const source = '| a |\n'
  const doc = {
    type: 'document',
    children: [{ type: 'table_cell', pos: pos(1, 4), children: [] }],
  }
  assert.deepEqual(findingsFor(doc, source), [])
})

test('the combined form keeps its derived inner span', () => {
  // `/*x*/` materialises a strong > emphasis pair from ONE run of delimiters,
  // and the inner span is the outer trimmed by two characters. There is no
  // second opening delimiter for the inner node to begin at, so neither type
  // is in the table.
  assert.equal(OPENING_MARKUP.has('emphasis'), false)
  assert.equal(OPENING_MARKUP.has('strong'), false)
})

test('THE OPT-IN TRAP: a tree with no positions examines nothing, and says so', () => {
  // Positions are behind a parse option in carve-rs and carve-php. A probe that
  // did not request them hands this rule a tree with no `pos` anywhere - and
  // zero findings from zero spans reads exactly like a clean run. The count is
  // the only thing that tells the two apart, which is why the rule returns it
  // and the corpus test below asserts on it.
  const unrequested = {
    type: 'document',
    children: [{ type: 'block_quote', children: [{ type: 'paragraph', children: [] }] }],
  }
  const findings = []
  assert.equal(checkOpeningMarkup(unrequested, [...'> q\n'], findings), 0)
  assert.deepEqual(findings, [])
})

test('no corpus document begins a span away from its opening markup', () => {
  // The synthetic documents above prove the rule fires; this proves it does not
  // fire on a real one, over every type the table names. The EXAMINED count is
  // asserted because zero findings out of zero spans is the same output as a
  // clean run - the shape carve#755 catalogues.
  const dir = resolve(repo, 'tests/corpus')
  const cases = readdirSync(dir).filter((name) => name.endsWith('.crv'))
  let examined = 0
  for (const name of cases) {
    const source = readFileSync(resolve(dir, name), 'utf8')
    const findings = []
    examined += checkOpeningMarkup(parse(source), [...source], findings)
    assert.deepEqual(findings, [], `${name}\n${findings.join('\n')}`)
  }
  assert.ok(examined > 1000, `only ${examined} span(s) reached the opening-markup rule`)
})

test('CONTAINMENT, in a pass of its own, over every corpus document', () => {
  // Asserted separately from the opening-markup rule on purpose (carve#913).
  // The two point the same way today, which is exactly why a checker deriving
  // one from the other would go quiet with nothing failing the day the
  // convention was revisited. Same non-vacuity guard: the pass counts the
  // parent/child pairs it compared.
  const dir = resolve(repo, 'tests/corpus')
  const cases = readdirSync(dir).filter((name) => name.endsWith('.crv'))
  let pairs = 0
  for (const name of cases) {
    const source = readFileSync(resolve(dir, name), 'utf8')
    const findings = []
    pairs += checkContainment(parse(source), findings)
    assert.deepEqual(findings, [], `${name}\n${findings.join('\n')}`)
  }
  assert.ok(pairs > 2000, `only ${pairs} parent/child pair(s) were compared`)
})
