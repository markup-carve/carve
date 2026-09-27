/*
 * PART 12 §27 (`CARVE-P12-049`) on the three line-oriented targets: a code
 * block in a cell contributes its payload and "neither its header nor its
 * label, which are not payload" (carve#2389), and "a raw block and an
 * abbreviation definition contribute NOTHING" (carve#2390).
 *
 * THE TEST IS A DIFFERENTIAL, not a golden. Each case declares the INLINE cell
 * that carries the same contribution, and the claim is that the two cells write
 * the same line. A golden would pass the day the contribution changed and the
 * expected string was recut with it; this cannot, because the inline side is
 * spelled from the clause rather than measured.
 *
 * `scripts/parity-check.mjs` runs the same differential across three engine
 * binaries and is where the cross-engine answer lives (carve#2397). It needs all
 * three built, so it is skipped wherever they are not. This file asks the same
 * question of the ONE build the ordinary suite has - the `@markup-carve/carve`
 * package pin - which is what makes it a gate on every PR rather than on a job
 * with engines in it.
 *
 * MEASURED AGAINST THE PIN AFTER carve-js#2147, which routes Markdown, plain and
 * ANSI through one cell flattener. Before that merge ten of these twelve pairs
 * failed, and the pin carried the older build for most of the day - so a fixture
 * written from the ticket rather than from a measurement would have been red.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fromAstJson, renderAnsi, renderCarve, renderMarkdown, renderPlainText } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

const text = (value) => ({ type: 'text', value })
const paragraph = (value) => ({ type: 'paragraph', children: [text(value)] })

const cell = (content) => ({
  type: 'document',
  srcByteLength: 0,
  children: [{ type: 'table', rows: [{ type: 'table_row', cells: [{ type: 'table_cell', header: false, ...content }] }] }],
})

/* The three targets the clause binds. HTML keeps the blocks AS blocks, so it is
 * not a flatten and not this file's subject. */
const TARGETS = { markdown: renderMarkdown, plain: renderPlainText, ansi: renderAnsi }

const write = (target, content) => TARGETS[target](fromAstJson(JSON.parse(JSON.stringify(cell(content)))))

const CASES = {
  'code header and label': {
    blocks: [{ type: 'code_block', content: 'x = 1\n', lang: 'php', header: 'src/Auth.php', label: 'NPM' }],
    inlines: [text('x = 1')],
  },
  'raw block': {
    blocks: [{ type: 'raw_block', format: 'html', content: '<b>x</b>\n' }],
    inlines: [],
  },
  'abbreviation definition': {
    blocks: [{ type: 'abbreviation_def', abbr: 'NPM', expansion: 'Node Package Manager' }],
    inlines: [],
  },
  // The one case where "contributes NOTHING" meets "separated by one space
  // where BOTH SIDES contribute a token": a definition between two paragraphs
  // must leave one space, not two and not three.
  'abbreviation definition between two paragraphs': {
    blocks: [paragraph('one'), { type: 'abbreviation_def', abbr: 'NPM', expansion: 'Node Package Manager' }, paragraph('two')],
    inlines: [text('one two')],
  },
}

/*
 * Declared lag against the `@markup-carve/carve` build package.json pin, as
 * `case/target` pairs where the pin does NOT yet write the clause's line, each
 * with the reason - a bare pair is a window tolerated rather than declared.
 * EMPTY IS THE GOAL: `scripts/declaration-audit.mjs` counts these rows as owed
 * before a tag, so the pin bump that clears them takes the entries out with it.
 */
test('the clause says it, so no engine has to infer it from "payload"', () => {
  assert.match(grammar, /neither its header nor its label, which are not payload/)
  assert.match(grammar, /A raw block and\s+an abbreviation definition contribute NOTHING/)
})

test('a block cell writes the line its inline equivalent writes', () => {
  const failing = []
  for (const [name, { blocks, inlines }] of Object.entries(CASES)) {
    for (const target of Object.keys(TARGETS)) {
      if (write(target, { blocks }) !== write(target, { children: inlines })) failing.push(`${name}/${target}`)
    }
  }
  assert.deepEqual(failing.sort(), [], 'a block cell added or lost content against its inline equivalent')
})

test('the differential can tell the two cells apart', () => {
  // The control. Every row above is an EQUALITY, so a comparison that always
  // returned true would read as a clean pass on the two pairs the pin gets
  // right. A cell that contributes a paragraph is not the same line as an empty
  // one, and the comparison has to say so.
  for (const target of Object.keys(TARGETS)) {
    assert.notEqual(write(target, { blocks: [paragraph('p')] }), write(target, { children: [] }), target)
  }
})

test('every case and target is accounted for, so a dropped row cannot pass', () => {
  // The assertion above collects FAILURES, so deleting a case leaves it empty
  // and green. The population is fixed here, by the kind each case is for.
  assert.deepEqual(Object.keys(TARGETS), ['markdown', 'plain', 'ansi'])
  assert.deepEqual(Object.keys(CASES).map((name) => name.split(' ')[0]).sort(), [
    'abbreviation',
    'abbreviation',
    'code',
    'raw',
  ])
  for (const { blocks } of Object.values(CASES)) assert.ok(blocks.length >= 1)
})

test("a payload's terminating newline contributes a trailing space, which reads as an artifact", () => {
  // Reported alongside carve#2389 rather than pinned as intended behavior. The
  // clause says "each newline becoming one space", and a code block's content
  // conventionally ENDS with a newline - it terminates the last line rather than
  // separating two - so a literal reading puts a trailing space on the
  // contribution of every ordinary code block. `scripts/parity-check.mjs`
  // already assumes the other reading: its `code payload` case pairs
  // "first\nsecond\n" with the inline text "first second", no trailing space.
  //
  // The Carve target is where it is visible, the code-span delimiters holding
  // the space that cell padding hides on the other three.
  const payload = (content) => renderCarve(fromAstJson(JSON.parse(JSON.stringify(cell({ blocks: [{ type: 'code_block', content }] })))))
  assert.equal(payload('x = 1\n'), '| `x = 1 ` |\n')
  assert.equal(payload('x = 1'), '| `x = 1` |\n')
  assert.equal(payload('x = 1\ny = 2\n'), '| `x = 1 y = 2 ` |\n')
})
