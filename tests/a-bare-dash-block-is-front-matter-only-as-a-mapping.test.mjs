/*
 * CARVE-P2-030's shape test, pinned branch by branch.
 *
 * The converter corpus pins what an IMPORTER produces; this pins the test
 * itself, key spelling by key spelling. The clause is the authority and
 * `scripts/lib/frontmatter-shape.mjs` is one reading of it, so a disagreement
 * here is a defect in the reading.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { frontmatterEnd, shapesAsMapping } from '../scripts/lib/frontmatter-shape.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const MAPPING = ['title: Hi', 'title:', 'title:\tHi', '"my title": Hi', "'my title': Hi", 'title: [unclosed']

// `:foo: Hi` belongs here because the key holds a `:` at its first position,
// which the "holds no `:`" half of the rule refuses like any other position.
const NOT_MAPPING = ['Foo', 'a:b: Hi', ':foo: Hi', '- one', '[seq]', '{a: 1}', '  title: Hi', 'title:Hi']

test('a first remaining line that shapes as a mapping is front matter', () => {
  for (const line of MAPPING) assert.equal(shapesAsMapping([line]), true, JSON.stringify(line))
})

test('a first remaining line that does not shape as a mapping is not', () => {
  for (const line of NOT_MAPPING) assert.equal(shapesAsMapping([line]), false, JSON.stringify(line))
})

test('blank lines and comment lines are skipped, and only those', () => {
  assert.equal(shapesAsMapping(['', '  ', '# note', 'title: Hi']), true)
  assert.equal(shapesAsMapping(['  # indented note', 'title: Hi']), true)
  // An indented KEY is the first remaining line and fails the column-0 test
  // rather than being skipped on to the next line.
  assert.equal(shapesAsMapping(['  title: Hi', 'title: Hi']), false)
})

test('an empty or comment-only block is not a mapping', () => {
  assert.equal(shapesAsMapping([]), false)
  assert.equal(shapesAsMapping(['# just a note']), false)
  assert.equal(shapesAsMapping(['', '']), false)
})

test('a typed opener is front matter with no shape test at all', () => {
  for (const format of ['yaml', 'toml', 'json', 'neon']) {
    const source = `---${format}\nFoo\n---\nBody\n`
    assert.equal(frontmatterEnd(source), source.indexOf('Body'), format)
  }
  // The same payload under a BARE opener is not front matter.
  assert.equal(frontmatterEnd('---\nFoo\n---\nBody\n'), -1)
})

test('the envelope is a leading block with a closer, and nothing else', () => {
  assert.equal(frontmatterEnd('---\ntitle: Hi\n---\nBody\n'), '---\ntitle: Hi\n---\n'.length)
  assert.equal(frontmatterEnd('---yaml\ntitle: Hi\n---\nBody\n'), '---yaml\ntitle: Hi\n---\n'.length)
  // No closer, so PART 1's lookahead claims no opener in the first place.
  assert.equal(frontmatterEnd('---\ntitle: Hi\nBody\n'), -1)
  // Not at byte 0.
  assert.equal(frontmatterEnd('x\n---\ntitle: Hi\n---\n'), -1)
  assert.equal(frontmatterEnd('---\nFoo\n---\nBar\n---\nBaz\n'), -1)
})

test('the clause the module reads is the one in the grammar', () => {
  // A renumbered or reworded clause must not leave this module pointing at
  // nothing, which is the dead-check failure mode.
  const grammar = readFileSync(resolve(repo, 'resources/grammar.ebnf'), 'utf8')
  assert.match(grammar, /NORMATIVE\s+\[CARVE-P2-030\]/)
  assert.match(grammar, /A TYPED OPENER IS FRONTMATTER UNCONDITIONALLY/)
  assert.match(grammar, /holds no `:`/)
  assert.match(grammar, /MALFORMED CONTENT: `title: \[unclosed`/)
})
