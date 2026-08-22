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
 * Measured 2026-08-22 against the carve-js this repository pins, over every
 * corpus document: 98 findings across 91 documents, out of 2846 containers
 * examined. Until the engines land carve#1522 and carve#1524 that is the state
 * this file RECORDS rather than hides - the same discipline
 * resources/ast-span-divergence.txt applies one layer up.
 *
 * IT FAILS IN BOTH DIRECTIONS, which is the point. A document that starts
 * over-reaching is not on the list and fails; a document that STOPS is on the
 * list with a count that no longer matches and fails, so deleting lines here is
 * the closing step of each engine's fix rather than a chore nobody is holding.
 * When the list empties, the assertion becomes a plain "no findings" and both
 * issues are done.
 *
 * WHAT THE 98 ARE: 74 a `list` reaching past its last item, 4 a `block_quote`
 * doing the same, and 20 a container a collected definition emptied, which the
 * ruling reached separately (markup-carve/carve-rs#1233). Forty-five of the
 * first group are a list reaching over the line terminator that ends it -
 * markup-carve/carve-js#1304 and markup-carve/carve-rs#1232, filed separately
 * and subsumed by this rule rather than excluded from it.
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
  '329-a-floating-attribute-is-scoped-to-the-container-that-holds-it.crv 1',
  '335-a-comment-fence-at-an-item-s-content-column-registers-nothing-either.crv 1',
  '336-a-footnote-definition-inside-an-item-s-comment-registers-nothing.crv 1',
  '337-a-comment-fence-opened-on-an-item-s-marker-line-hides-its-body-too.crv 1',
  '338-a-comment-fence-one-item-deeper-registers-nothing-either.crv 1',
  '339-a-wider-comment-fence-inside-an-item-hides-its-body-the-same-way.crv 1',
  '347-a-comment-fence-reached-through-a-quote-registers-nothing-either-3.crv 1',
  '350-a-definition-at-a-container-s-content-column-2.crv 1',
  '350-a-definition-at-a-container-s-content-column-3.crv 1',
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
    const source = readFileSync(resolve(dir, name), 'utf8')
    const findings = []
    examined += checkStopsAtChildren(parse(source), [...source], findings)
    if (findings.length > 0) measured.set(name, findings.length)
  }
  assert.deepEqual(
    [...measured.entries()].map(([name, count]) => `${name} ${count}`).sort(),
    [...DECLARED_OVER_REACH].sort(),
    'update DECLARED_OVER_REACH in the commit that moves the engines, never to quiet a run',
  )
  assert.ok(examined > 2000, `only ${examined} node(s) reached the stops-at-its-children rule`)
})
