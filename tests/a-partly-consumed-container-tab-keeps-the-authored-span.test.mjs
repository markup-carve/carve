/*
 * A line block nested in a list, whose body line starts with a TAB the
 * container strip consumed only part of (carve#2353). The reproducer is the
 * ticket's, and the ticket reported three defects across three engines: an
 * empty span at offsets 13..13, the authored `x` left unplaced, and spans
 * published for the columns the tab generated.
 *
 * TWO OF THE THREE ARE SETTLED AND ONLY THIS FILE SAYS SO. The authored `x`
 * keeps its exact span and no node publishes an empty one, and nothing asserted
 * either - the position gate counts OMITTED positions against
 * `resources/ast-position-waivers.txt`, so a span that exists and is WRONG is
 * invisible to it. The third was answered rather than fixed: carve#2349
 * recorded the generated columns' omission as permitted, so a gap node carrying
 * no trustworthy position is the ruling, not a defect.
 *
 * THE FOURTH IS NOW FIXED, by carve-js#2179: the gap standing for a column the
 * strip generated publishes no position, so the paragraph copies its next placed
 * child instead of the newline that ends the line above. Every position the
 * reproducer publishes addresses its own offset, which is what the bottom test
 * asserts.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { carveToAstJson } from '@markup-carve/carve'

// The ticket's document. The body line's first character is a literal tab, and
// the list's content column is 2, so the strip consumes two of the four columns
// the tab owes and two remain.
const SOURCE = '- a\n\n  ::: |\n\t  x\n  :::\n'

// Offsets in SOURCE: line 4 runs 13..17 as "\t  x", so `x` is 16..17.
const X_START = SOURCE.indexOf('x', 13)

const lineStarts = (source) => {
  const starts = [0]
  for (let i = 0; i < source.length; i += 1) if (source[i] === '\n') starts.push(i + 1)
  return starts
}

/* Every node that published a position, with the node type beside it. */
const placed = (source) => {
  const json = carveToAstJson(source)
  const out = []
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    if (node.type && node.pos) out.push({ type: node.type, pos: node.pos })
    for (const key of Object.keys(node)) if (key !== 'type' && key !== 'pos') walk(node[key])
  }
  walk(typeof json === 'string' ? JSON.parse(json) : json)
  return out
}

/*
 * Nodes whose line and column do not address their own offset. Columns are
 * 1-based and counted in codepoints (CARVE-P7-001 clause 1), so the offset a
 * position claims is derivable from the other two fields and a disagreement is
 * a defect no candidate unit explains away.
 */
const inconsistent = (source) => {
  const starts = lineStarts(source)
  return placed(source).filter(({ pos }) => {
    const start = starts[pos.startLine - 1]
    const line = source.slice(start, starts[pos.startLine] ?? source.length)
    return pos.startOffset !== start + [...line].slice(0, pos.startColumn - 1).join('').length
  })
}

test('the authored text keeps its exact span', () => {
  // The PHP half of carve#2353: `x` was left unplaced, which loses the mapping
  // for the one character on the line the author wrote.
  const x = placed(SOURCE).find(({ type, pos }) => type === 'text' && pos.startLine === 4)
  assert.ok(x, 'the authored text on the verse line published no position at all')
  assert.equal(x.pos.startOffset, X_START)
  assert.equal(x.pos.endOffset, X_START + 1)
  assert.equal(SOURCE.slice(x.pos.startOffset, x.pos.endOffset), 'x')
})

test('no node publishes an empty span', () => {
  // The Rust half: a span at 13..13 is empty, which is wrong under every
  // candidate column unit and so was never a unit disagreement.
  const empty = placed(SOURCE).filter(({ pos }) => pos.startOffset === pos.endOffset)
  assert.deepEqual(empty, [], 'an empty span came back')
})

test('the generated columns are gap nodes, which carve#2349 permits', () => {
  // Stated so the file cannot be read as claiming the gaps SHOULD be placed.
  // Two columns of the tab survive the strip and two literal spaces follow it,
  // so there are four gap nodes. Only three carry a position: `x` holds 16..17
  // and three columns precede it on the line, so the fourth placement does not
  // exist inside the line and carve#2349 permits its omission.
  const gaps = placed(SOURCE).filter(({ type }) => type === 'non_breaking_space')
  assert.equal(gaps.length, 3)
})

test('the three CONTROL shapes address their own offsets', () => {
  // Without these, a fixture that only looked at the reproducer could not say
  // whether the inconsistency belongs to the partly-consumed tab or to every
  // line block. None of the three has one.
  // A leading tab with nothing consuming it, a nested block with SPACES where
  // the reproducer has a tab, and a verse line with no leading whitespace.
  for (const source of ['::: |\n\tx\n:::\n', '- a\n\n  ::: |\n    x\n  :::\n', '::: |\nx\n:::\n']) {
    assert.deepEqual(
      inconsistent(source).map(({ type }) => type),
      [],
      `${JSON.stringify(source)} published an inconsistent position`,
    )
  }
})

test('the reproducer addresses its own offsets too', () => {
  // The paragraph and its first gap used to claim startLine 4 with startOffset
  // 12, the newline that ENDS line 3, and startColumn 0 where every other node
  // is 1-based. Under carve-js#2179 the paragraph reads line 4, column 1,
  // offset 13.
  assert.deepEqual(inconsistent(SOURCE).map(({ type }) => type), [])
})
