/*
 * CARVE-P7-001 clause 1: a column is counted in Unicode codepoints, "never in
 * bytes, UTF-16 code units or display cells". PART 9 §23 MEDIAL GAPS hands a
 * tab after text to the same arithmetic, "counted from the column the run
 * starts at", so a line block is where the unit is observable in a tree.
 *
 * WHY THIS IS NOT A GOLDEN. A count that only records what the engine answers
 * today cannot say which unit produced it, and an ASCII line cannot either: for
 * `ab` the three candidate units agree on 2. The disagreement needs a character
 * whose count differs per unit, so each case below carries what ALL THREE units
 * predict and asserts the measured count is the codepoint one and not another.
 * A unit regression then names the unit it changed to.
 *
 * WHY AN ASTRAL CHARACTER IS THE ONE THAT MATTERS. It is the only class that
 * separates codepoints from UTF-16 code units, which is how carve-js counted
 * before markup-carve/carve-js#2139 (carve#2354). A combining mark separates
 * codepoints from display cells. A precomposed BMP character separates nothing
 * and is here as the control that says so.
 *
 * `41-line-blocks-9` already pins the ASCII ladder in the corpus. Nothing
 * pinned a non-ASCII column anywhere, in any engine.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

const TAB_STOP = 4

/* Columns a tab owes from a run starting at `column`, landing on the next stop. */
const owed = (column) => TAB_STOP - (column % TAB_STOP)

/*
 * What MEDIAL GAPS makes of that run: two or more columns are preserved as
 * `non_breaking_space` nodes, a LONE column stays an ordinary collapsible
 * space and the text around it merges into one run.
 */
const predict = (column) => (owed(column) >= 2 ? owed(column) : 0)

const UNITS = {
  codepoints: (s) => [...s].length,
  'UTF-16 code units': (s) => s.length,
  // Every case below uses either a zero-width combining mark or an emoji, the
  // two classes whose display width is not their codepoint count.
  'display cells': (s) => [...s].reduce((n, c) => n + (/\p{Mn}/u.test(c) ? 0 : (c.codePointAt(0) > 0xffff ? 2 : 1)), 0),
}

const walk = (node, type, out = []) => {
  if (Array.isArray(node)) node.forEach((child) => walk(child, type, out))
  else if (node && typeof node === 'object') {
    if (node.type === type) out.push(node)
    for (const key of Object.keys(node)) if (key !== 'type') walk(node[key], type, out)
  }
  return out
}

/* One line block whose single body line is `before`, a tab, then `x`. */
const measure = (before) => {
  const tree = parse(`::: |\n${before}\tx\n:::\n`)
  return {
    gaps: walk(tree, 'non_breaking_space').length,
    texts: walk(tree, 'text').map((node) => node.value),
  }
}

/*
 * `excludes` is the units this case rules out, and it is part of the fixture
 * rather than a comment: the test below derives the same list from the
 * arithmetic and fails when a case stops discriminating what it was added for.
 *
 * The non-ASCII cases are spelled as ESCAPES on purpose. Written as literals,
 * `\u00e9` and `e\u0301` are two different fixtures that look the same in an
 * editor, and an NFC-folding edit collapses the second into the first without
 * changing a visible character.
 */
const CASES = [
  { before: 'a', why: 'ASCII, three columns owed', excludes: [] },
  { before: 'ab', why: 'ASCII, two columns owed', excludes: [] },
  { before: 'abc', why: 'ASCII, the lone-column boundary', excludes: [] },
  { before: '\u00e9', why: 'precomposed e-acute U+00E9, the control that discriminates nothing', excludes: [] },
  { before: '\u20ac', why: 'euro U+20AC, a three-byte BMP character', excludes: [] },
  { before: '\u{1F600}', why: 'one astral character: codepoints say 1 where UTF-16 says 2', excludes: ['UTF-16 code units', 'display cells'] },
  { before: '\u{1F600}\u{1F600}', why: 'two astral characters: 2 columns owed where UTF-16 owes 4', excludes: ['UTF-16 code units', 'display cells'] },
  { before: '\u{1F600}ab', why: 'the lone-column boundary AT an astral column', excludes: ['UTF-16 code units', 'display cells'] },
  { before: 'e\u0301', why: 'e plus combining acute U+0301: two columns, not one display cell', excludes: ['display cells'] },
]

test('the population still holds the classes the file exists for', () => {
  // Without this, DELETING the astral case leaves a green suite: the loops below
  // are data-driven, so a shorter list is a smaller claim rather than a failure.
  // Each class is named by what it separates, not by its case count, so a case
  // may be swapped for a better one of the same class.
  const classOf = (before) =>
    /\p{Mn}/u.test(before) ? 'combining' : [...before].some((c) => c.codePointAt(0) > 0xffff) ? 'astral' : /^[ -~]*$/.test(before) ? 'ascii' : 'bmp'
  const present = new Set(CASES.map(({ before }) => classOf(before)))
  assert.deepEqual([...present].sort(), ['ascii', 'astral', 'bmp', 'combining'])
  assert.ok(
    CASES.some(({ before, excludes }) => classOf(before) === 'astral' && excludes.includes('UTF-16 code units')),
    'no astral case rules out UTF-16 code units, so nothing here can see the carve#2354 bug',
  )
  assert.ok(
    CASES.some(({ before, excludes }) => classOf(before) === 'combining' && excludes.includes('display cells')),
    'no combining case rules out display cells',
  )
})

test('CARVE-P7-001 clause 1 states the unit, and MEDIAL GAPS defers to it', () => {
  assert.match(grammar, /column is counted in UNICODE CODEPOINTS/)
  assert.match(grammar, /never in bytes, UTF-16 code units or display cells/)
  assert.match(grammar, /Tab arithmetic is the leading run's, counted/)
  assert.match(grammar, /A LONE inner space is NOT/)
})

for (const { before, why } of CASES) {
  test(`a medial tab after ${JSON.stringify(before)} reaches its stop by codepoints - ${why}`, () => {
    const { gaps } = measure(before)
    assert.equal(
      gaps,
      predict(UNITS.codepoints(before)),
      `counting by codepoints owes ${owed(UNITS.codepoints(before))} columns, and the tree carries ${gaps} gaps`,
    )
  })
}

test('the measured count EXCLUDES the units the clause rules out', () => {
  // The claim the clause makes is negative, so the cases that carry it are the
  // ones where a wrong unit predicts a different tree. Checking the derived
  // list against each case's declared `excludes` keeps the loop above from
  // reading as nine equivalent rows: five of the nine cannot tell the units
  // apart, and a file of only those would pass under every unit.
  for (const { before, excludes } of CASES) {
    const { gaps } = measure(before)
    const right = predict(UNITS.codepoints(before))
    const derived = []
    for (const [unit, count] of Object.entries(UNITS)) {
      if (unit === 'codepoints') continue
      const wrong = predict(count(before))
      if (wrong === right) continue
      derived.push(unit)
      assert.notEqual(gaps, wrong, `${JSON.stringify(before)} counted in ${unit}: ${wrong} gaps`)
    }
    assert.deepEqual(derived, excludes, `${JSON.stringify(before)} no longer excludes what it was added for`)
  }
})

test('the lone-column boundary merges the text instead of generating a gap', () => {
  // markup-carve/carve#2349 recorded the omission as permitted, and MEDIAL GAPS
  // is why: one owed column is a LONE inner space, which stays collapsible. It
  // is invisible in every other row, and it holds at an astral column too.
  for (const before of ['abc', '\u{1F600}ab']) {
    const { gaps, texts } = measure(before)
    assert.equal(gaps, 0, `${JSON.stringify(before)} generated a gap for one owed column`)
    assert.deepEqual(texts, [`${before} x`], 'the lone space did not merge the text around it')
  }
})

test('two owed columns keep the text in separate runs', () => {
  // The control for the row above: without it, an engine that merged EVERY
  // tabbed line would read as correct on the boundary case alone.
  for (const before of ['ab', '\u{1F600}\u{1F600}']) {
    const { gaps, texts } = measure(before)
    assert.equal(gaps, 2)
    assert.deepEqual(texts, [before, 'x'])
  }
})
