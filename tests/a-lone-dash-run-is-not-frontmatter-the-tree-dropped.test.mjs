/*
 * A DASH RUN WITH NO CLOSER IS A THEMATIC BREAK, and the conformance oracle has
 * to agree.
 *
 * `checkFrontmatterSurvives` asked `/^---\r?\n/`, which is the frontmatter
 * OPENER without the closer the layout requires. So
 * `550-a-dash-run-opens-frontmatter-only-at-the-start-and-only-a-dash-run.crv`,
 * a document that is a lone `---`, was reported as "source has frontmatter but
 * the tree does not carry it" against carve-js, carve-rs, carve-php AND
 * carve-rb at once. All four were right.
 *
 * That finding class is UNGATED by design - "no ledger covers this finding
 * class, and none should: fix it rather than declaring it" - so there was no
 * declaration that could absorb it, and `AST full-corpus verdict` failed on
 * main with the oracle as the only artifact in the org making the claim
 * (carve#2881). The same shape as carve#907: four engines agreeing and the
 * oracle alone reading an opener where the language has none.
 *
 * The rule now has ONE spelling, `sourceOpensFrontmatter` in the layout, which
 * is where the closer lookahead already lived.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sourceOpensFrontmatter } from '../scripts/spec/layout.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpus = resolve(here, 'corpus')

test('a lone dash run does not open frontmatter', () => {
  // The real corpus document, not a fixture written to match the reader.
  const name = '550-a-dash-run-opens-frontmatter-only-at-the-start-and-only-a-dash-run.crv'
  const source = readFileSync(join(corpus, name), 'utf8')
  assert.match(source, /^---\s*$/, 'the document is no longer a lone dash run; re-read the case')
  assert.equal(sourceOpensFrontmatter(source), false)
})

test('an opener needs a closer, in either line ending', () => {
  assert.equal(sourceOpensFrontmatter('---\ntitle: x\n---\n'), true)
  assert.equal(sourceOpensFrontmatter('---\r\ntitle: x\r\n---\r\n'), true)
  assert.equal(sourceOpensFrontmatter('---\ntitle: x\n'), false, 'an unclosed run is a thematic break')
})

test('the typed opener keeps the slot rules the layout already settled', () => {
  assert.equal(sourceOpensFrontmatter('---yaml\na: 1\n---\n'), true)
  assert.equal(sourceOpensFrontmatter('--- yaml\na: 1\n---\n'), true)
  // carve#901, carve#907, carve#912: a tab, a non-space whitespace character,
  // and a two-space run are each NOT the padding slot before a format token.
  assert.equal(sourceOpensFrontmatter('---\tyaml\na: 1\n---\n'), false)
  assert.equal(sourceOpensFrontmatter('--- yaml\na: 1\n---\n'), false)
  assert.equal(sourceOpensFrontmatter('---  yaml\na: 1\n---\n'), false)
  // carve#1295: a whitespace run with NOTHING after it is trailing whitespace,
  // so the bare opener survives it.
  assert.equal(sourceOpensFrontmatter('---\t\na: 1\n---\n'), true)
})

test('frontmatter opens only at the start', () => {
  assert.equal(sourceOpensFrontmatter('text\n---\na: 1\n---\n'), false)
})

test('no corpus document is claimed as frontmatter without a closer', () => {
  // The guard that would have caught this: the oracle may not claim frontmatter
  // for a document the language reads as a thematic break.
  const wrong = []
  for (const name of readdirSync(corpus).filter((file) => file.endsWith('.crv'))) {
    const source = readFileSync(join(corpus, name), 'utf8')
    if (!/^---/.test(source)) continue
    const closed = source.split('\n').slice(1).some((line) => /^---[ \t]*$/.test(line.replace(/\r$/, '')))
    if (!closed && sourceOpensFrontmatter(source)) wrong.push(name)
  }
  assert.deepEqual(wrong, [], `claimed as frontmatter with no closer:\n  ${wrong.join('\n  ')}`)
})
