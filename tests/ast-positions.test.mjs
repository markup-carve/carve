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
import { parse, toAstJson } from '@markup-carve/carve'
import { replaceNulls } from '../scripts/spec/layout.mjs'
import {
  ENDS_AT_LAST_CHILD,
  HOISTED_DEFINITION_TYPES,
  OPENING_MARKUP,
  checkContainment,
  checkOpeningMarkup,
  checkPositions,
  checkStopsAtChildren,
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

test('a CRLF hard break that dropped its backslash is reported', () => {
  // THE SAME DEFECT, ON A CRLF DOCUMENT (carve#1566). The rule tested for a
  // bare newline with the backslash directly before it, and on CRLF that is
  // true of neither anchoring: a break at the CR is not looking at a newline,
  // and one at the LF finds the CR where the backslash would be. So the rule
  // written for markup-carve/carve-rs#492 could not see it here at all.
  const source = 'a\\\r\nb\r\n'
  const doc = {
    type: 'document',
    children: [{ type: 'hard_break', pos: pos(2, 4) }],
  }
  const findings = findingsFor(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /hard break span starts after its backslash/)
})

test('a CRLF hard break covering its backslash is accepted', () => {
  const source = 'a\\\r\nb\r\n'
  const doc = {
    type: 'document',
    children: [{ type: 'hard_break', pos: pos(1, 4) }],
  }
  assert.deepEqual(findingsFor(doc, source), [])
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

test('a text node holding a LITERAL backslash is still compared', () => {
  // The skip's stated reason is that resolving an escape leaves the slice
  // LONGER than the value it produced. A backslash the parser left literal -
  // one before a character Carve does not escape - resolves to nothing and
  // keeps the two the same length, so the reason does not reach it and the
  // comparison runs (carve#1566). Two corpus text nodes are in this shape.
  const source = 'a\\q b\n'
  const doc = {
    type: 'document',
    children: [{ type: 'text', value: 'WRONG', pos: pos(0, 5) }],
  }
  const findings = findingsFor(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /does not cover the text it belongs to/)
})

test('a backslash cannot excuse a difference larger than the backslash count', () => {
  // Resolving an escape consumes exactly one backslash and emits one character,
  // so a set of escapes shortens the value by at most the number of backslashes
  // in the slice. `a\\q` against a value of `x` is two characters short with one
  // backslash to pay for it, which no escape reaches - so it is a wrong span
  // rather than the format working, and the bound says so arithmetically.
  const source = 'a\\q'
  const doc = {
    type: 'document',
    children: [{ type: 'text', value: 'x', pos: pos(0, 3) }],
  }
  const findings = findingsFor(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /does not cover the text it belongs to/)
})

test('two escapes may account for two characters', () => {
  const source = 'a\\*b\\*c'
  const doc = {
    type: 'document',
    children: [{ type: 'text', value: 'a*b*c', pos: pos(0, 7) }],
  }
  assert.deepEqual(findingsFor(doc, source), [])
})

test('a text node whose backslash IS an escape is left alone', () => {
  // The reason the skip exists, and it survives the narrowing: the escape is
  // resolved into the value, so the source is longer than the text it produced
  // and the two can never be equal.
  const source = 'say\\ hello\n'
  const doc = {
    type: 'document',
    children: [{ type: 'text', value: 'say hello', pos: pos(0, 10) }],
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
  // ONE CONTAINMENT FINDING, FILTERED RATHER THAN COUNTED. This asserted that
  // the whole run produced exactly one finding, and that held only because
  // nothing else reached this document: the same synthetic list ends at 15 with
  // its last placed child ending at 5, so carve#1522's stops-at-its-children
  // rule reports it too and the count went to two. The original argument is
  // unchanged and now spelled as a filter - a child leaving its parent is
  // reported exactly once - and the second finding is asserted on its own line
  // so neither rule can go quiet behind the other.
  const outside = findings.filter((f) => f.startsWith('span outside its parent'))
  assert.equal(outside.length, 1, findings.join('\n'))
  assert.match(outside[0], /span outside its parent: "paragraph"/)
  assert.equal(
    findings.filter((f) => f.startsWith('span reaches past its last child')).length,
    1,
    findings.join('\n'),
  )
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
    const unexpected = findings.filter(
      (f) =>
        !f.startsWith('missing pos on ') &&
        // AND NOT carve#1522 / carve#1524, which are declared document by
        // document in the STOPS AT ITS CHILDREN test below. Excluded here
        // rather than tolerated: this test's subject is a span that starts on a
        // line terminator, and ninety-odd findings of another class landing in
        // it would bury the one it was written to catch. The exact set is
        // pinned below and fails in both directions, so nothing is lost by
        // filtering it out here.
        !f.startsWith('span reaches past its last child') &&
        !f.startsWith('span covers more than its own markup'),
    )
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
 * A BREAK IS EXEMPT FROM THE OVERLAP RULE AGAINST ANOTHER BREAK, AND NOTHING
 * ELSE (carve#1566).
 *
 * The exemption was a set of TYPES consulted against one node at a time, while
 * its stated reason was already about the PAIR - "two breaks meeting at one
 * newline". So a break overlapping a non-break sibling, the shape the rule
 * exists to catch, was invisible; and because an exempt node was dropped from
 * the comparison entirely, it was invisible in both directions.
 */

test('a break overlapping a comment is reported', () => {
  // markup-carve/carve-rs#1246, the shape it published for
  //
  //     ::: |
  //     *a
  //     %% secret
  //     c*
  //     :::
  //
  // The `%% secret` line is 9..18 and the break that ends it is 18..19.
  // carve-rs gave the break 9..19, so the two siblings held the same nine
  // codepoints - and every checker in the file passed both readings.
  const source = '::: |\n*a\n%% secret\nc*\n:::\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'strong',
        pos: span(6, 21),
        children: [
          { type: 'text', value: 'a', pos: span(7, 8) },
          { type: 'hard_break', pos: span(8, 9) },
          { type: 'comment', pos: span(9, 18) },
          { type: 'hard_break', pos: span(9, 19) },
          { type: 'text', value: 'c', pos: span(19, 20) },
        ],
      },
    ],
  }
  const findings = []
  checkPositions(doc, source, findings)
  const overlap = findings.filter((f) => f.includes('sibling spans overlap'))
  assert.equal(overlap.length, 1, `expected one overlap finding, got: ${JSON.stringify(findings)}`)
  assert.match(overlap[0], /"hard_break" starts at 9, inside "comment" which ends at 18/)
})

test('the same document with the break where it belongs is clean', () => {
  // markup-carve/carve-rs#1265 fixed it to 18..19. The rule has to clear on the
  // fix as well as fire on the defect, or it is a rule against the construct
  // rather than against the span.
  const source = '::: |\n*a\n%% secret\nc*\n:::\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'strong',
        pos: span(6, 21),
        children: [
          { type: 'text', value: 'a', pos: span(7, 8) },
          { type: 'hard_break', pos: span(8, 9) },
          { type: 'comment', pos: span(9, 18) },
          { type: 'hard_break', pos: span(18, 19) },
          { type: 'text', value: 'c', pos: span(19, 20) },
        ],
      },
    ],
  }
  const findings = []
  checkPositions(doc, source, findings)
  assert.deepEqual(findings.filter((f) => f.includes('sibling spans overlap')), [])
})

for (const [a, b] of [
  ['soft_break', 'soft_break'],
  ['hard_break', 'hard_break'],
  ['soft_break', 'hard_break'],
]) {
  test(`a ${a} and a ${b} may meet at one newline`, () => {
    // The reason the exemption exists, and it survives the narrowing: a break
    // is anchored at a line terminator, so two of them sharing that boundary
    // are both right.
    const doc = {
      type: 'document',
      children: [{ type: a, pos: span(1, 2) }, { type: b, pos: span(1, 2) }],
    }
    const findings = []
    checkPositions(doc, 'a\nb\n', findings)
    assert.deepEqual(findings.filter((f) => f.includes('sibling spans overlap')), [])
  })
}

test('a break between two overlapping siblings does not hide them', () => {
  // WHY EVERY PAIR IS COMPARED. Once the exemption is a property of the pair,
  // an exempt node stays in the comparison - and a chain that only compares
  // neighbours then never compares the two siblings on either side of it. Each
  // of these is compared against the break, the break is exempt against
  // neither, and the overlap between them is the finding.
  const doc = {
    type: 'document',
    children: [
      { type: 'text', value: 'x', pos: span(0, 10) },
      { type: 'hard_break', pos: span(10, 11) },
      { type: 'comment', pos: span(5, 8) },
    ],
  }
  const findings = []
  checkPositions(doc, 'x'.repeat(20), findings)
  const overlap = findings.filter((f) => f.includes('sibling spans overlap'))
  assert.equal(overlap.length, 1, `expected one overlap finding, got: ${JSON.stringify(findings)}`)
  assert.match(overlap[0], /"comment" starts at 5, inside "text" which ends at 10/)
})

test('siblings the tree lists out of source order are not an overlap', () => {
  // Comparing every pair reaches siblings whose array order is not their source
  // order, which hoisting routinely produces. `second starts before first ends`
  // is not an overlap on its own once that is possible, so both ends are
  // tested: these two are disjoint and the rule has to say so.
  const doc = {
    type: 'document',
    children: [
      { type: 'paragraph', pos: span(15, 29), children: [] },
      { type: 'block_quote', pos: span(0, 13), children: [] },
    ],
  }
  const findings = []
  checkPositions(doc, 'x'.repeat(30), findings)
  assert.deepEqual(findings.filter((f) => f.includes('sibling spans overlap')), [])
})

test('no corpus document has a sibling overlap, in either engine shape', () => {
  // The synthetic cases above prove the narrowed rule fires; this proves it
  // does not fire on a real document. Measured over 1363 documents when the
  // narrowing landed: nought, which is what makes this a ratchet rather than a
  // number to update.
  const dir = resolve(repo, 'tests/corpus')
  const cases = readdirSync(dir).filter((name) => name.endsWith('.crv'))
  let compared = 0
  for (const name of cases) {
    const raw = readFileSync(resolve(dir, name), 'utf8')
    const findings = []
    // The PART 12 wire shape, for the reason the STOPS AT ITS CHILDREN pass
    // below reads it: §4 is normative about the interchange document, and a
    // parse tree spells some children without a `type` at all - which would
    // drop them out of the sibling comparison entirely.
    const doc = toAstJson(parse(raw))
    checkPositions(doc, replaceNulls(raw), findings)
    for (const [node] of walkNodes(doc)) {
      for (const [key, value] of Object.entries(node)) {
        if (key !== 'pos' && Array.isArray(value)) compared += value.length
      }
    }
    assert.deepEqual(
      findings.filter((f) => f.includes('sibling spans overlap')),
      [],
      `${name}: a sibling overlap is a defect in the engine, not a number to declare`,
    )
  }
  assert.ok(compared > 2000, `only ${compared} sibling(s) reached the overlap rule`)
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
  // THE QUOTE CARRIES ITS PARAGRAPH, which it did not when this was written:
  // an EMPTY container is a case of its own now, and a childless quote spanning
  // `q` is reported twice - once for starting at the content and once for
  // covering more than the markup it opened with. The argument here is the
  // first of those, so the document says what a quote holding `q` really is
  // and the finding count stays the assertion it was.
  const doc = {
    type: 'document',
    children: [
      {
        type: 'block_quote',
        pos: pos(2, 3),
        children: [{ type: 'paragraph', pos: pos(2, 3), children: [] }],
      },
    ],
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
    children: [
      {
        type: 'block_quote',
        pos: pos(0, 3),
        children: [{ type: 'paragraph', pos: pos(2, 3), children: [] }],
      },
    ],
  }
  assert.deepEqual(findingsFor(doc, source), [])
})

test('the indentation before a nested marker is inside the item, not outside it', () => {
  const source = '  - a\n'
  const placed = {
    type: 'document',
    children: [
      {
        type: 'list_item',
        pos: pos(0, 5),
        children: [{ type: 'paragraph', pos: pos(4, 5), children: [] }],
      },
    ],
  }
  assert.deepEqual(findingsFor(placed, source), [])

  // And an item that began at its own content is still reported, so the
  // allowance is for indentation and not for everything before the marker.
  const contentOnly = {
    type: 'document',
    children: [
      {
        type: 'list_item',
        pos: pos(4, 5),
        children: [{ type: 'paragraph', pos: pos(4, 5), children: [] }],
      },
    ],
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

test('a span opening on a space in MID-LINE has not begun at its markup', () => {
  // THE INDENT SKIP IS THE LINE'S OWN INDENTATION (carve#1566). It walked past
  // any space or tab the span happened to open on, wherever that was, so a span
  // starting one character early on a mid-line space matched the markup after
  // it and read as a pass - in a rule whose whole subject is whether a span
  // begins at the markup.
  const source = 'see `x` here\n'
  const doc = {
    type: 'document',
    children: [{ type: 'code', pos: pos(3, 7) }],
  }
  const findings = findingsFor(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /does not begin at the markup that opens "code"/)
})

test('a nested list starting part way into the indent run is accepted', () => {
  // The reason the skip exists, and it survives the narrowing. Corpus 245:
  //
  //     - a
  //         - b
  //
  // the inner list's span starts at offset 6, inside the four-space indent, at
  // its parent item's content column rather than at the line start. Everything
  // between the line start and there is whitespace, so it is indentation and
  // the marker is what follows it.
  const source = '- a\n    - b\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'list',
        pos: pos(6, 11),
        children: [
          {
            type: 'list_item',
            pos: pos(6, 11),
            children: [
              {
                type: 'paragraph',
                pos: pos(10, 11),
                children: [{ type: 'text', value: 'b', pos: pos(10, 11) }],
              },
            ],
          },
        ],
      },
    ],
  }
  assert.deepEqual(findingsFor(doc, source), [])
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
    const raw = readFileSync(resolve(dir, name), 'utf8')
    // Measured against the source PART 0 INPUT hands the parser, not the
    // fixture bytes, for the reason spelled out on the line-terminator pass
    // above: NUL becomes U+FFFD before the first line is read. The engine still
    // gets `raw`. Latent rather than firing today - no opener window or
    // over-reach tail currently covers the NUL in `397-...` - but it is the
    // same defect `scripts/ast-conformance.mjs` was reporting for real, and a
    // check that is only accidentally right is one carve#1531 is about.
    const source = replaceNulls(raw)
    const findings = []
    examined += checkOpeningMarkup(parse(raw), [...source], findings)
    assert.deepEqual(findings, [], `${name}\n${findings.join('\n')}`)
  }
  assert.ok(examined > 1000, `only ${examined} span(s) reached the opening-markup rule`)
})

test('CONTAINMENT does not count a pair it could not compare', () => {
  // The count is what makes a vacuous pass distinguishable from a clean one, so
  // a pair whose offsets are not integers must not inflate it: `undefined < 3`
  // and `undefined > 7` are both false, which made such a pair silently clean
  // AND silently counted (carve#1566). Latent on today's corpus - no engine
  // publishes a non-integer offset - and the count is the only thing standing
  // between this rule and the carve#755 shape, so it is checked here rather
  // than left to the day one does.
  const doc = {
    type: 'document',
    pos: pos(0, 10),
    children: [
      { type: 'paragraph', pos: { startLine: 1, endLine: 1, startColumn: 1, endColumn: 1 }, children: [] },
    ],
  }
  assert.equal(checkContainment(doc, []), 0)
  const placed = {
    type: 'document',
    pos: pos(0, 10),
    children: [{ type: 'paragraph', pos: pos(0, 5), children: [] }],
  }
  assert.equal(checkContainment(placed, []), 1)
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

/*
 * A CONTAINER STOPS AT ITS LAST PLACED CHILD (PART 12 section 4, carve#1522
 * and carve#1524).
 *
 * The half of containment nobody wrote. `checkContainment` says a parent covers
 * its children and says nothing about where it ends, so a container reaching
 * arbitrarily far past everything in it read as a clean run for as long as this
 * file has existed - and all three engines did exactly that, identically, which
 * is why the three-way span panel could not see it either.
 */

const stopFindings = (doc, source) => {
  const findings = []
  checkStopsAtChildren(doc, [...source], findings)
  return findings
}

test('a list ending past the definition hoisted out of it is reported', () => {
  // carve#1522, the shape every engine published. The definition is a
  // document-level sibling (PART 12 section 7), so offsets 5..14 sat in two
  // nodes at once and a consumer resolving offset 8 got two answers.
  const source = '- a\n\n  [r]: /u\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'list',
        pos: pos(0, 14),
        children: [
          {
            type: 'list_item',
            pos: pos(0, 3),
            children: [{ type: 'paragraph', pos: pos(2, 3), children: [] }],
          },
        ],
      },
      { type: 'link_reference_definition', pos: pos(5, 14) },
    ],
  }
  const findings = stopFindings(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /span reaches past its last child on "list"/)
  assert.match(findings[0], /it ends at 14, its last child ends at 3/)
})

test('a list ending past an unattached attribute block is reported', () => {
  // carve#1524. No ruling was needed: section 4 excludes an unattached
  // attribute block by name, and the block yields no child to end at.
  const source = '- a\n  {.x}\ntail\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'list',
        pos: pos(0, 10),
        children: [
          {
            type: 'list_item',
            pos: pos(0, 3),
            children: [{ type: 'paragraph', pos: pos(2, 3), children: [] }],
          },
        ],
      },
      { type: 'paragraph', pos: pos(11, 15), children: [] },
    ],
  }
  const findings = stopFindings(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /"\\n {2}\{\.x\}" belongs to no child of it/)
})

test('a container ending exactly at its last child is not reported', () => {
  const source = '- a\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'list',
        pos: pos(0, 3),
        children: [
          {
            type: 'list_item',
            pos: pos(0, 3),
            children: [{ type: 'paragraph', pos: pos(2, 3), children: [] }],
          },
        ],
      },
    ],
  }
  assert.deepEqual(stopFindings(doc, source), [])
})

test('a trailing blank run is reported too, and is the same defect', () => {
  // SUBSUMED, not carved out. carve-js and carve-rs end a list after the blank
  // run that follows it and carve-php does not, which is filed separately
  // (markup-carve/carve-js#1304, markup-carve/carve-rs#1232) - and a container
  // that stops at its last placed child cannot reach into a blank run at all,
  // so the two are one defect seen from two sides. An earlier draft of this
  // rule tolerated a whitespace-only tail so as not to report a row that had
  // an owner; that made the rule contradict the ruling it enforces, which is
  // why it now fires and those documents are declared with the rest.
  const source = '- a\n\n\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'list',
        pos: pos(0, 6),
        children: [
          {
            type: 'list_item',
            pos: pos(0, 3),
            children: [{ type: 'paragraph', pos: pos(2, 3), children: [] }],
          },
        ],
      },
    ],
  }
  const findings = stopFindings(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /"\\n\\n\\n" belongs to no child of it/)
})

test('an emptied container spans the markup that opened it and stops there', () => {
  // The addendum to carve#1522: "ends at its last placed child" is silent when
  // there is none, and a definition written as an item's only content is
  // collected out of it and leaves nothing behind (markup-carve/carve-rs#1233).
  const source = '* * [d]: u\n :\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'list',
        pos: pos(0, 4),
        items: [
          {
            type: 'list_item',
            pos: pos(0, 4),
            children: [{ type: 'list', pos: pos(2, 10), items: [] }],
          },
        ],
      },
    ],
  }
  const findings = stopFindings(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /span covers more than its own markup on an empty "list"/)
  assert.match(findings[0], /is "\* \[d\]: u"/)
})

test('an emptied container spanning only its marker is accepted', () => {
  // The pair, for the reason the opening-markup rule keeps one: the rule has to
  // be the reason the finding appears, not the document.
  const source = '* * [d]: u\n :\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'list',
        pos: pos(0, 4),
        items: [
          {
            type: 'list_item',
            pos: pos(0, 4),
            children: [{ type: 'list', pos: pos(2, 4), items: [] }],
          },
        ],
      },
    ],
  }
  assert.deepEqual(stopFindings(doc, source), [])
})

test('a container holding an unplaced child is skipped rather than guessed at', () => {
  // Section 4 permits a REASSEMBLED node to omit `pos`. Where one does, the
  // last PLACED child is not the container's last child, so the bound this rule
  // would compare against is short by whatever the unplaced child covers and
  // every finding would be false. A line block's spaced content is that case.
  const source = 'ab\ncd\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'paragraph',
        pos: pos(0, 5),
        children: [{ type: 'text', pos: pos(0, 2), value: 'ab' }, { type: 'text', value: 'cd' }],
      },
    ],
  }
  assert.deepEqual(stopFindings(doc, source), [])
})

test('a definition list reaching an attribute line no child covers is reported', () => {
  // carve#1530. The line is INSIDE the list for scope - a floating attribute
  // does not escape the container that holds it - and outside its span, because
  // it attaches to nothing and yields no child. Both readings are live at once,
  // and only one of them is about the extent.
  const source = ':: t\n:  d\n   {.k}\ntail\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'definition_list',
        pos: pos(0, 17),
        items: [
          { type: 'definition_term', pos: pos(0, 4), children: [] },
          { type: 'definition_description', pos: pos(5, 9), children: [] },
        ],
      },
    ],
  }
  const findings = stopFindings(doc, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /reaches past its last child on "definition_list"/)
  assert.match(findings[0], /it ends at 17, its last child ends at 9/)
})

test('a definition list that stops at its last description is accepted', () => {
  // The other direction, so the finding above is the RULE and not the document.
  // Deleting `definition_list` from the type set makes the pair above pass and
  // this one pass too, which is the state carve#1530 ended.
  const source = ':: t\n:  d\n   {.k}\ntail\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'definition_list',
        pos: pos(0, 9),
        items: [
          { type: 'definition_term', pos: pos(0, 4), children: [] },
          { type: 'definition_description', pos: pos(5, 9), children: [] },
        ],
      },
    ],
  }
  assert.deepEqual(stopFindings(doc, source), [])
  assert.ok(ENDS_AT_LAST_CHILD.has('definition_list'))
})

test('the parse tree cannot answer for a definition list, so the corpus pass reads the wire shape', () => {
  // The reason the corpus pass below serializes before it checks, pinned so it
  // cannot be simplified back. carve-js parses a definition list into bare
  // records with no `type` and no `pos`; the rule finds no children in one,
  // takes the empty-container branch and falls out, so naming the type would
  // buy nothing. `toAstJson` is what gives the items spans to be measured
  // against.
  const source = ':: t\n:  d\n   {.k}\ntail\n'
  const parsed = parse(source)
  const list = parsed.children[0]
  assert.equal(list.type, 'definition_list')
  assert.ok(list.items.every((item) => typeof item.type !== 'string'))
  assert.deepEqual(stopFindings(parsed, source), [])

  const wire = toAstJson(parse(source))
  const findings = stopFindings(wire, source)
  assert.equal(findings.length, 1, findings.join('\n'))
  assert.match(findings[0], /"definition_list"/)
})

test('a container with a closer is not reached by this rule', () => {
  // A div ends at `:::`, not at its last child, and section 4 says so. The rule
  // is a type set for the same reason OPENING_MARKUP is one: only the type says
  // whether a node has a closer.
  const source = '::: n\na\n:::\n'
  const doc = {
    type: 'document',
    children: [
      {
        type: 'div',
        pos: pos(0, 11),
        children: [{ type: 'paragraph', pos: pos(6, 7), children: [] }],
      },
    ],
  }
  assert.deepEqual(stopFindings(doc, source), [])
  assert.ok(!ENDS_AT_LAST_CHILD.has('div'))
  assert.ok(!ENDS_AT_LAST_CHILD.has('table'))
})

/*
 * THE CORPUS, DECLARED RED.
 *
 * Measured 2026-08-23 against the carve-js this repository pins, over every
 * corpus document: 105 findings across 98 documents, out of 2943 containers
 * examined. Until the engines land carve#1522, carve#1524 and carve#1530 that
 * is the state this file RECORDS rather than hides - the same discipline
 * resources/ast-span-divergence.txt applies one layer up.
 *
 * IT FAILS IN BOTH DIRECTIONS, which is the point. A document that starts
 * over-reaching is not on the list and fails; a document that STOPS is on the
 * list with a count that no longer matches and fails, so deleting lines here is
 * the closing step of each engine's fix rather than a chore nobody is holding.
 * When the list empties, the assertion becomes a plain "no findings" and both
 * issues are done.
 *
 * WHAT THE 105 ARE: 75 a `list` reaching past its last item, 4 a `block_quote`
 * doing the same, 20 a container a collected definition emptied, which the
 * ruling reached separately (markup-carve/carve-rs#1233), and 6 a
 * `definition_list` reaching past its last description (carve#1530). Forty-five
 * of the first group are a list reaching over the line terminator that ends it -
 * markup-carve/carve-js#1304 and markup-carve/carve-rs#1232, filed separately
 * and subsumed by this rule rather than excluded from it.
 *
 * THE SIX ARE THE SAME THREE SHAPES ONE CONTAINER OVER, which is the evidence
 * that nothing about a definition list's shape was doing the work: two are the
 * unattached attribute block of carve#1524 (`329-...-5`, `329-...-6`), one is
 * the hoisted definition of carve#1522 (`350-...-5`), one is the trailing
 * whitespace the same rule excludes (`268-...-5`), and two are the pair added
 * to pin it (`399-...`). The 75th `list` row is `401-...`, the fixture added for
 * markup-carve/carve#1517: its item holds a sub-list the blank line closed, and
 * the pinned build reaches over that blank run - markup-carve/carve-js#1304, the
 * same defect this rule subsumes rather than excludes.
 */
const DECLARED_OVER_REACH = [
  '05-lists-10.crv 1',
  '105-marker-line-nested-lists-3.crv 1',
  '105-marker-line-nested-lists-4.crv 1',
  '117-footnote-definition-inside-a-container-is-collected-2.crv 1',
  '117-footnote-definition-inside-a-container-is-collected.crv 1',
  '143-post-blank-list-continuation-content-column-model.crv 1',
  '16-reference-link-3.crv 1',
  '16-reference-link-4.crv 2',
  '162-outer-item-with-an-internal-blank-before-an-attached-block-is-loose.crv 1',
  '173-implicit-heading-references-with-no-definition.crv 1',
  '174-bare-dot-ordered-markers-2.crv 1',
  '180-a-list-item-does-not-define-an-abbreviation-either.crv 1',
  '191-a-blank-after-a-comment-still-ends-the-item.crv 1',
  '194-an-abbreviation-at-a-list-item-s-content-column-is-still-not-a-definition-2.crv 1',
  '194-an-abbreviation-at-a-list-item-s-content-column-is-still-not-a-definition.crv 1',
  '195-a-definition-inside-a-container-is-collected-at-that-container-s-content-column-2.crv 2',
  '195-a-definition-inside-a-container-is-collected-at-that-container-s-content-column.crv 1',
  '206-a-nested-list-in-a-footnote-body-stays-nested.crv 1',
  '226-a-definition-attached-by-a-continuation-marker-is-collected-and-the-item-keeps-no-trace.crv 1',
  '228-a-line-at-a-footnote-definition-s-own-column-followed-by-non-blank-text-forms-its-own-tight-block.crv 1',
  '246-the-continuation-marker-at-an-item-s-own-column-and-what-follows-it-2.crv 1',
  '246-the-continuation-marker-at-an-item-s-own-column-and-what-follows-it-3.crv 1',
  '246-the-continuation-marker-at-an-item-s-own-column-and-what-follows-it.crv 1',
  '247-a-continuation-marker-after-a-blank-line-in-the-item.crv 1',
  '249-trailing-whitespace-after-a-block-marker-6.crv 1',
  '251-a-continuation-marker-after-a-blank-line-in-a-loose-item.crv 1',
  '259-a-tab-continues-a-list-item-just-as-two-spaces-do-2.crv 1',
  '259-a-tab-continues-a-list-item-just-as-two-spaces-do.crv 1',
  '266-a-reference-definition-is-anchored-at-end-of-line-11.crv 1',
  '266-a-reference-definition-is-anchored-at-end-of-line-14.crv 1',
  '266-a-reference-definition-is-anchored-at-end-of-line-15.crv 1',
  '268-trailing-whitespace-on-a-content-line-is-dropped-4.crv 2',
  '268-trailing-whitespace-on-a-content-line-is-dropped-5.crv 1',
  '279-a-boundary-line-inside-an-open-fence-does-not-end-the-container-7.crv 1',
  '290-adjacent-sibling-lists-survive-the-round-trip-2.crv 2',
  '290-adjacent-sibling-lists-survive-the-round-trip-3.crv 1',
  '290-adjacent-sibling-lists-survive-the-round-trip.crv 1',
  '324-an-abbreviation-definition-in-an-item-body-is-paragraph-text-4.crv 1',
  '326-a-column-0-line-after-a-container-s-last-block-when-that-block-left-no-paragraph-open-21.crv 1',
  '326-a-column-0-line-after-a-container-s-last-block-when-that-block-left-no-paragraph-open-22.crv 1',
  '326-a-column-0-line-after-a-container-s-last-block-when-that-block-left-no-paragraph-open-7.crv 1',
  '326-a-column-0-line-after-a-container-s-last-block-when-that-block-left-no-paragraph-open-8.crv 1',
  '326-a-column-0-line-after-a-container-s-last-block-when-that-block-left-no-paragraph-open-9.crv 1',
  '329-a-floating-attribute-is-scoped-to-the-container-that-holds-it-2.crv 1',
  '329-a-floating-attribute-is-scoped-to-the-container-that-holds-it-3.crv 1',
  '329-a-floating-attribute-is-scoped-to-the-container-that-holds-it-4.crv 1',
  '329-a-floating-attribute-is-scoped-to-the-container-that-holds-it-5.crv 1',
  '329-a-floating-attribute-is-scoped-to-the-container-that-holds-it-6.crv 1',
  '329-a-floating-attribute-is-scoped-to-the-container-that-holds-it.crv 1',
  '335-a-comment-fence-at-an-item-s-content-column-registers-nothing-either.crv 1',
  '336-a-footnote-definition-inside-an-item-s-comment-registers-nothing.crv 1',
  '337-a-comment-fence-opened-on-an-item-s-marker-line-hides-its-body-too.crv 1',
  '338-a-comment-fence-one-item-deeper-registers-nothing-either.crv 1',
  '339-a-wider-comment-fence-inside-an-item-hides-its-body-the-same-way.crv 1',
  '347-a-comment-fence-reached-through-a-quote-registers-nothing-either-3.crv 1',
  '350-a-definition-at-a-container-s-content-column-2.crv 1',
  '350-a-definition-at-a-container-s-content-column-3.crv 1',
  '350-a-definition-at-a-container-s-content-column-5.crv 1',
  '350-a-definition-at-a-container-s-content-column.crv 1',
  '356-a-quote-inside-a-quote-is-asked-what-it-ends-on-5.crv 1',
  '357-a-block-at-a-container-s-content-column-ends-the-paragraph-whatever-it-renders-4.crv 1',
  '357-a-block-at-a-container-s-content-column-ends-the-paragraph-whatever-it-renders-5.crv 1',
  '357-a-block-at-a-container-s-content-column-ends-the-paragraph-whatever-it-renders-6.crv 1',
  '357-a-block-at-a-container-s-content-column-ends-the-paragraph-whatever-it-renders.crv 1',
  '358-what-a-content-column-block-does-not-reach-2.crv 1',
  '359-a-footnote-definition-s-block-runs-to-the-end-of-its-body-2.crv 1',
  '359-a-footnote-definition-s-block-runs-to-the-end-of-its-body.crv 1',
  '360-a-definition-behind-an-alternating-container-prefix-registers-at-the-innermost-content-column-2.crv 2',
  '360-a-definition-behind-an-alternating-container-prefix-registers-at-the-innermost-content-column-4.crv 1',
  '360-a-definition-behind-an-alternating-container-prefix-registers-at-the-innermost-content-column.crv 2',
  '361-a-paragraph-opened-after-a-block-in-an-item-is-still-open-for-a-lazy-line-4.crv 1',
  '362-an-unterminated-container-does-not-extend-the-item-past-a-blank-line.crv 1',
  '364-only-lazy-folding-demotes-a-marker-line-colon-opener-2.crv 1',
  '364-only-lazy-folding-demotes-a-marker-line-colon-opener.crv 1',
  '367-an-unterminated-fence-at-a-content-column-opens-no-block-so-the-paragraph-stays-open-4.crv 1',
  '369-a-quote-is-reached-by-its-marker-and-a-column-never-reaches-into-one-2.crv 1',
  '369-a-quote-is-reached-by-its-marker-and-a-column-never-reaches-into-one-4.crv 1',
  '374-a-collected-definition-closes-the-item-paragraph-2.crv 1',
  '374-a-collected-definition-closes-the-item-paragraph-4.crv 1',
  '374-a-collected-definition-closes-the-item-paragraph.crv 1',
  '379-a-reference-definition-cannot-take-its-destination-from-the-next-line-3.crv 1',
  '381-a-resumed-lazy-run-belongs-to-the-innermost-marker-line-item-5.crv 1',
  '381-a-resumed-lazy-run-belongs-to-the-innermost-marker-line-item-6.crv 1',
  '381-a-resumed-lazy-run-belongs-to-the-innermost-marker-line-item-8.crv 1',
  '382-a-marker-line-link-definition-is-collected-where-no-paragraph-is-open.crv 2',
  '383-a-lazy-marker-line-s-definition-defines-nothing-in-any-container-4.crv 1',
  '383-a-lazy-marker-line-s-definition-defines-nothing-in-any-container-5.crv 1',
  '384-a-continuation-marker-attaches-only-a-flush-left-block-2.crv 1',
  '384-a-continuation-marker-attaches-only-a-flush-left-block-3.crv 1',
  '398-a-container-s-span-ends-at-its-last-placed-child-2.crv 1',
  '398-a-container-s-span-ends-at-its-last-placed-child.crv 1',
  '399-a-definition-list-ends-at-its-last-placed-child-too-2.crv 1',
  '399-a-definition-list-ends-at-its-last-placed-child-too.crv 1',
  '401-a-marker-at-an-item-content-column-opens-a-sublist-first-in-the-item-or-not.crv 1',
  '82-blockquote-lazy-continuation-6.crv 1',
  '86-list-lazy-continuation-5.crv 1',
  '87-compact-list-blocks-5.crv 1',
  '87-compact-list-blocks-9.crv 1',
]

test('STOPS AT ITS CHILDREN, over every corpus document', () => {
  // Declared as `<document> <count>`, so a document growing a second
  // over-reaching container fails here too rather than reading as the one
  // already declared. Same non-vacuity guard as the two passes above: the rule
  // counts the nodes it examined, because zero findings out of zero nodes is
  // the output of a clean run and of a run that never happened.
  const dir = resolve(repo, 'tests/corpus')
  const cases = readdirSync(dir).filter((name) => name.endsWith('.crv'))
  let examined = 0
  const measured = new Map()
  for (const name of cases) {
    const raw = readFileSync(resolve(dir, name), 'utf8')
    // Measured against the source PART 0 INPUT hands the parser, not the
    // fixture bytes, for the reason spelled out on the line-terminator pass
    // above: NUL becomes U+FFFD before the first line is read. The engine still
    // gets `raw`. Latent rather than firing today - no opener window or
    // over-reach tail currently covers the NUL in `397-...` - but it is the
    // same defect `scripts/ast-conformance.mjs` was reporting for real, and a
    // check that is only accidentally right is one carve#1531 is about.
    const source = replaceNulls(raw)
    const findings = []
    // THE PART 12 WIRE SHAPE, NOT THE PARSE TREE, and the rule needs it. §4 is
    // normative about the interchange document, and the two shapes agree for
    // every container this rule names EXCEPT `definition_list`: carve-js parses
    // one into bare `{ terms, definitions, ... }` records with no `type` and no
    // `pos`, so the rule finds no children in it, takes the empty-container
    // branch and falls out. Naming the type without reading this shape would
    // have been a check that cannot fail - the carve#755 family, inside the
    // check written to close one. Measured: over the parse tree the pass
    // reports 98 findings and examines 2846 nodes with `definition_list` in the
    // type set and 98 out of 2846 with it removed, which is the tell.
    examined += checkStopsAtChildren(toAstJson(parse(raw)), [...source], findings)
    if (findings.length > 0) measured.set(name, findings.length)
  }
  assert.deepEqual(
    [...measured.entries()].map(([name, count]) => `${name} ${count}`).sort(),
    [...DECLARED_OVER_REACH].sort(),
    'update DECLARED_OVER_REACH in the commit that moves the engines, never to quiet a run',
  )
  assert.ok(examined > 2000, `only ${examined} node(s) reached the stops-at-its-children rule`)
})

/*
 * A CONTAINER STARTS AT ITS OPENING MARKUP EVEN WHERE ITS FIRST CHILD IS
 * UNPLACED (PART 12 section 4, markup-carve/carve-rs#1247).
 *
 * The arrangement the extent rules above do not name. `checkStopsAtChildren`
 * answers the end, its empty-container branch answers a container with no
 * placed child at all, and neither reaches a container that HAS children whose
 * FIRST one omits `pos`.
 *
 * A line block stanza holding a TAB is that shape: the verse text is rebuilt
 * with expanded tabs, whose display width is not a source length, so every
 * engine declines to place it - while the break ending that line and the
 * `comment` an emptied `%%` line leaves behind are both line geometry and are
 * placed. Starting the paragraph at the first PLACED child then dropped the
 * stanza's own first line out of its extent and left the break OUTSIDE the
 * paragraph holding it, which is a containment violation rather than a matter
 * of taste - and `checkContainment` is what names it.
 *
 * NOTHING SAW IT, which is the reason the corpus pair went in with the clause:
 * no corpus document put a tab in a stanza that also holds a comment line, so
 * the three-way span panel had no such document to compare and neither this
 * arrangement nor the illegal tree it produced was reachable from any run.
 */

test('a container starting at its first PLACED child is reported by containment', () => {
  // The shape carve-rs published, spelled out: `a`, TAB, `b` at 6..9, the
  // terminator at 9..10, the `%%` line at 10..12. The paragraph took the
  // comment's own span and so began one line below its own first line.
  const findings = []
  const pairs = checkContainment(
    {
      type: 'document',
      children: [
        {
          type: 'line_block',
          pos: pos(0, 16),
          children: [
            {
              type: 'paragraph',
              pos: pos(10, 12),
              children: [
                { type: 'text', value: 'ab' },
                { type: 'hard_break', pos: pos(9, 10) },
                { type: 'comment', block: false, content: '', pos: pos(10, 12) },
              ],
            },
          ],
        },
      ],
    },
    findings,
  )

  assert.equal(pairs, 3)
  assert.equal(findings.length, 1)
  assert.match(findings[0], /"hard_break".*\[9, 10\].*is not inside "paragraph".*\[10, 12\]/)
})

test('the corpus pair for it starts on the line the author wrote', () => {
  // Read from the fixture rather than retyped, so the pair and the clause
  // cannot drift apart - and because the document's whole point is a byte an
  // editor does not show.
  const source = readFileSync(
    resolve(
      repo,
      'tests/corpus',
      '400-a-container-starts-at-its-opening-markup-even-where-its-first-child-is-unplaced.crv',
    ),
    'utf8',
  )
  assert.ok(source.includes('\t'), 'the tab is the case; without it nothing here is unplaced')

  const wire = toAstJson(parse(source))
  const paragraph = wire.children[0].children[0]
  const [text, hardBreak] = paragraph.children

  // The reassembled text keeps NO position, and that half was ruled explicitly:
  // an absent span is honest where a fabricated one is not.
  assert.equal(text.type, 'text')
  assert.equal(text.pos, undefined)

  // And the paragraph still starts on the line holding it, not below.
  assert.equal(paragraph.pos.startOffset, 6)
  assert.equal(hardBreak.type, 'hard_break')
  assert.equal(hardBreak.pos.startOffset, 9)
  assert.ok(
    hardBreak.pos.startOffset >= paragraph.pos.startOffset &&
      hardBreak.pos.endOffset <= paragraph.pos.endOffset,
    'the break that ends the tab-bearing line sits outside its own paragraph',
  )
})

/*
 * A CONTAINER ENDS AT THE MARKUP THAT CLOSES IT EVEN WHERE ITS LAST CHILD IS
 * UNPLACED (PART 12 section 4, carve#1551).
 *
 * The mirror of the rule above it, and the arrangement `checkStopsAtChildren`
 * used to SKIP. Its skip read: a child may omit `pos`, and where one does the
 * last placed child is not the container's last child, so the bound is short
 * and every finding false. True only where the unplaced child sits after the
 * last placed one - which is to say where it is the LAST child - and that is
 * the one arrangement carve#1522's ruling did not name. So the check enforcing
 * that ruling excused itself on precisely its undefined case, and carve-rs and
 * the other two engines disagreed on a document with nothing red.
 *
 * The document is corpus 402: `::: |`, a `%%` line, then a tab-bearing verse
 * line. The verse text is reassembled around expanded tabs so no engine places
 * it, and it is the paragraph's LAST child; the last child that does carry a
 * position is the `hard_break` ending the `%%` line above it. carve-rs ended
 * the paragraph at 9, where that break ends, and carve-js and carve-php at 12,
 * where the tab-bearing line ends.
 *
 * Ending at 9 puts the paragraph's end one past the terminator the break owns
 * and drops the stanza's own last line out of the paragraph holding it - which
 * is markup-carve/carve-rs#1247 read backwards, and why the two halves of the
 * clause are now symmetric statements about markup.
 */

test('a container stopping at its last PLACED child is reported', () => {
  // The shape carve-rs published for corpus 402, spelled out: the `%%` line at
  // 6..8, the break ending it at 8..9, and the reassembled verse text over
  // 9..12 carrying no position. The paragraph took the break's end.
  const source = '::: |\n%%\na\tb\n:::\n'
  const findings = stopFindings(
    {
      type: 'document',
      children: [
        {
          type: 'line_block',
          pos: pos(0, 16),
          children: [
            {
              type: 'paragraph',
              pos: pos(6, 9),
              children: [
                { type: 'comment', block: false, content: '', pos: pos(6, 8) },
                { type: 'hard_break', pos: pos(8, 9) },
                { type: 'text', value: 'ab' },
              ],
            },
          ],
        },
      ],
    },
    source,
  )

  assert.equal(findings.length, 1)
  assert.match(
    findings[0],
    /span stops at its last PLACED child on "paragraph".*it ends at 9, its last child carries no position, and the source from 9 on is that child's/,
  )
})

test('the same container ending where the stanza ends is clean', () => {
  // The ruled shape, and the one carve-js and carve-php already published. The
  // ONLY difference from the case above is the paragraph's end, so a check that
  // reported both or neither would prove nothing about the rule.
  const source = '::: |\n%%\na\tb\n:::\n'
  assert.deepEqual(
    stopFindings(
      {
        type: 'document',
        children: [
          {
            type: 'line_block',
            pos: pos(0, 16),
            children: [
              {
                type: 'paragraph',
                pos: pos(6, 12),
                children: [
                  { type: 'comment', block: false, content: '', pos: pos(6, 8) },
                  { type: 'hard_break', pos: pos(8, 9) },
                  { type: 'text', value: 'ab' },
                ],
              },
            ],
          },
        ],
      },
      source,
    ),
    [],
  )
})

test('an unplaced child with a placed sibling after it still bounds the container', () => {
  // The other half of the un-skip, and the half the old code had no reason to
  // decline: the unplaced `text` moves no bound, because the `comment` after it
  // supplies one. This is corpus 400's arrangement with the container's end
  // pushed one line too far, and it was UNREACHABLE while any unplaced child
  // skipped the node.
  const source = '::: |\na\tb\n%%\n:::\n'
  const findings = stopFindings(
    {
      type: 'document',
      children: [
        {
          type: 'line_block',
          pos: pos(0, 16),
          children: [
            {
              type: 'paragraph',
              pos: pos(6, 16),
              children: [
                { type: 'text', value: 'ab' },
                { type: 'hard_break', pos: pos(9, 10) },
                { type: 'comment', block: false, content: '', pos: pos(10, 12) },
              ],
            },
          ],
        },
      ],
    },
    source,
  )

  assert.equal(findings.length, 1)
  assert.match(findings[0], /span reaches past its last child on "paragraph".*it ends at 16, its last child ends at 12/)
})

test('the corpus pair for it ends where the author closed the stanza', () => {
  // Read from the fixture rather than retyped, for the reason the pair above
  // gives: the document's point is a byte an editor does not show.
  const source = readFileSync(
    resolve(
      repo,
      'tests/corpus',
      '402-a-container-ends-at-the-markup-that-closes-it-even-where-its-last-child-is-unplaced.crv',
    ),
    'utf8',
  )
  assert.ok(source.includes('\t'), 'the tab is the case; without it nothing here is unplaced')

  const wire = toAstJson(parse(source))
  const paragraph = wire.children[0].children[0]
  const children = paragraph.children
  const last = children[children.length - 1]

  // The reassembled text keeps NO position, and it is the LAST child - which is
  // the whole arrangement. Without both halves this document is corpus 400.
  assert.equal(last.type, 'text')
  assert.equal(last.pos, undefined)

  // 12 is the end of the tab-bearing line; 9 is one past the terminator the
  // break above it owns.
  assert.equal(paragraph.pos.endOffset, 12)
  const placed = children.filter((child) => child.pos)
  assert.equal(Math.max(...placed.map((child) => child.pos.endOffset)), 9)

  // And the rule REACHES it now. Zero findings out of a node the check declined
  // to look at is the output this case used to produce.
  const findings = []
  const examined = checkStopsAtChildren(wire, [...source], findings)
  assert.deepEqual(findings, [])
  assert.ok(examined > 0, 'the container with an unplaced last child was skipped again')
})
