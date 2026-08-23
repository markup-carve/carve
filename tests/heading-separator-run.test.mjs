/*
 * A heading's marker separator is a run, in all three places that say so.
 *
 * carve#1581 moved one rule through three artifacts at once: the
 * `heading_first_line` production in resources/grammar.ebnf, the `headingL` and
 * `headingStart` rules in resources/carve-core.ohm, and the `HEADING` pattern in
 * scripts/spec/layout.mjs. The corpus pins the third one - 406 and its siblings
 * are what a reader of the rendered HTML can see - and pins NEITHER of the
 * first two.
 *
 * That gap is not theoretical here. resources/carve-core.ohm's block layer
 * RECOGNIZES and does not expose the text, so `heading` accepted `##  h` before
 * this ruling and accepts it after: the second space simply moved from the
 * content to the separator, and no accept/reject fixture can tell those apart.
 * A behavioral gate cannot observe the correction at that layer at all, which
 * is the same hole carve#907 found at the code fence and answered the same way -
 * pin the SPELLING, in one place, beside the production it has to match.
 *
 * The behavioral half below is the oracle's, and it is deliberately kept next
 * to the text pins rather than left to the corpus alone: it is what says which
 * READING the two spellings are supposed to produce, so a future edit that
 * satisfies the text and inverts the meaning still fails.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(repo, p), 'utf8')

// Productions wrap, so match the flattened text, as scripts/normative-clauses.mjs does.
const grammar = read('resources/grammar.ebnf').replace(/\n\s*/g, ' ')
const ohm = read('resources/carve-core.ohm')

test('resources/grammar.ebnf spells the heading separator as a run', () => {
  assert.match(
    grammar,
    /heading_first_line = heading_marker, space\+, inline_content, newline ;/,
    'heading_first_line no longer spells `space+`. A marker separator is what stands ' +
      'between the marker and the content it introduces (PART 2, MARKER SEPARATORS AND ' +
      'PADDING SLOTS); narrowing it back to one space puts the second space in the ' +
      'heading text, which is the divergence carve#1581 closed.',
  )
})

test('resources/carve-core.ohm spells the same run, in both rules that carry it', () => {
  // The derived file, and the one no behavioral check can reach here: `heading`
  // accepts `##  h` under either spelling because `inline` matches a space.
  assert.match(
    ohm,
    /^ {2}headingL<h> = h " "\+ inline\+ lineEnd$/m,
    'resources/carve-core.ohm no longer spells the heading separator as a run.\n' +
      '  The two normative files have to agree: grammar.ebnf says `space+` here.\n' +
      '  This rule RECOGNIZES and does not expose the text, so the text check is its\n' +
      '  only observer - do not delete it expecting a behavioral gate to have caught it.',
  )
  assert.match(
    ohm,
    /^ {2}headingStart = hashes " "\+$/m,
    'resources/carve-core.ohm no longer spells the paragraph-interruption boundary as a run.\n' +
      '  It mirrors `headingL` above and moves with it (carve#1581).',
  )
})

test('the oracle reads the run as separator, and only the run', () => {
  const html = (src) => renderDoc(parse(src))
  // The run is separator to its last space: the heading is `h`, not `<SP>h`.
  assert.match(html('##  h\n'), /<h2>h<\/h2>/)
  assert.match(html('###   a b\n'), /<h3>a b<\/h3>/)
  // `space = ' '` (PART 1), so the first character that is not one BEGINS the
  // text. The tab stays, exactly as it does after a caret.
  assert.match(html('## \tx\n'), /<h2>\tx<\/h2>/)
  // A tab where the separator itself must be is not a heading at all.
  assert.match(html('##\tx\n'), /<p>##\tx<\/p>/)
  // MARKER REQUIRES CONTENT (PART 2) applies AFTER the run: hashes, separator
  // and nothing but whitespace open no heading. This is the half every reader
  // including the oracle already had, and the half `space+` must not lose - a
  // greedy run with no content behind it has to fail rather than match empty.
  assert.match(html('##   \n'), /<p>##<\/p>/)
  assert.match(html('#  \n'), /<p>#<\/p>/)
})

test('the id does not move with the text, and the crossref auto-text does', () => {
  // Worth pinning because carve#1581 predicted the opposite for the id: a
  // leading run is slugged away either way, so only the TEXT moved, and with it
  // a crossref's auto-text (PART 9 §19).
  const out = renderDoc(parse('##  a b\n\nSee </#a-b>.\n'))
  assert.match(out, /<section id="a-b">/)
  assert.match(out, /<a href="#a-b">a b<\/a>/)
})
