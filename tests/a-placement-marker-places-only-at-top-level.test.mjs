/*
 * PART 9 §16's CARVE-P9-073 (carve#2274), read AND run.
 *
 * The clause half keeps the ruling in the grammar: the container set, the floor
 * it degrades to, where the section goes instead, and the lint rule id are each
 * asserted separately, because losing any one of them leaves a rule that reads
 * complete and answers a different question.
 *
 * The behavior half runs the executable spec, which is the oracle the corpus is
 * checked against. Corpus row 497 pins the block quote; the list item and the
 * footnote definition are here instead of as four more corpus rows, and the
 * top-level marker and the unmarked document are the controls that fail if the
 * refusal is written too wide.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')
const oracleHtml = (source) => renderDoc(parse(source)).trim()

function clause() {
  const start = grammar.indexOf('A PLACEMENT MARKER PLACES ONLY AT DOCUMENT TOP LEVEL')
  assert.notEqual(start, -1, 'CARVE-P9-073 is gone from the grammar')
  const rest = grammar.slice(start)
  const end = rest.indexOf('- BACKLINK PLACEMENT WHEN THE BODY DOES NOT END IN A PARAGRAPH')
  assert.notEqual(end, -1, 'CARVE-P9-073 no longer sits above the backlink-placement bullet')
  return rest.slice(0, end)
}

test('the clause carries its id and refuses the nested placement', () => {
  const body = clause()
  assert.match(body, /\[CARVE-P9-073\]/)
  assert.match(body, /does not place/)
})

test('the clause names every container, not only the block quote', () => {
  const body = clause()
  for (const container of [
    'block quote',
    'list item',
    'div or directive body',
    'table cell',
    'definition description',
    'footnote definition',
  ]) assert.match(body, new RegExp(container.replace(/ /g, '\\s+')), container)
})

test('the clause names the floor and where the section goes instead', () => {
  const body = clause()
  assert.match(body, /`<div class="\{kind\}">` floor/)
  assert.match(body, /appended where an unmarked document puts it/)
})

test('the clause names the diagnostic a refused marker reports', () => {
  const body = clause()
  assert.match(body, /lint\s+diagnostics/)
  assert.match(body, /`footnotes-placement-in-container`/)
})

test('a marker inside a container renders the floor and the section at the end', () => {
  for (const [name, source] of [
    ['block quote', 'a[^1]\n\n> ::: footnotes\n> :::\n\n[^1]: body\n'],
    ['list item', 'a[^1]\n\n- ::: footnotes\n  :::\n\n[^1]: body\n'],
  ]) {
    const html = oracleHtml(source)
    assert.match(html, /<div class="footnotes">/, name)
    // The floor is where the marker was written and the section is after every
    // block, so the section cannot be the earlier of the two.
    assert.ok(
      html.indexOf('<div class="footnotes">') < html.indexOf('<section role="doc-endnotes"'),
      `${name}: the section did not follow the floor`,
    )
    assert.ok(html.trimEnd().endsWith('</section>'), `${name}: the section is not last`)
  }

  // A footnote definition is the one container the ordering reverses in: its
  // body IS the section's content, so the floor renders inside the very section
  // the marker failed to move. It must still be the floor and not a placement.
  const inNote = oracleHtml('a[^1]\n\n[^1]: body\n\n  ::: footnotes\n  :::\n')
  assert.match(inNote, /<li id="fn1">[\s\S]*<div class="footnotes">[\s\S]*<\/li>/)
  assert.equal(inNote.match(/<section role="doc-endnotes"/g).length, 1)
})

test('a top-level marker still places and an unmarked document is unchanged', () => {
  const placed = oracleHtml('a[^1]\n\n::: footnotes\n:::\n\n## After\n\nmore\n\n[^1]: body\n')
  assert.doesNotMatch(placed, /<div class="footnotes">/)
  // The index comparison below is read BEFORE it is used: a missing section
  // indexes at -1, which precedes every real offset and would read as placed.
  assert.match(placed, /<section role="doc-endnotes"/)
  // Placed means BEFORE the heading section that follows it, which is the only
  // thing that tells placement apart from the default append.
  assert.ok(
    placed.indexOf('<section role="doc-endnotes"') < placed.indexOf('<section id="After">'),
    'a top-level marker stopped placing',
  )

  const unmarked = oracleHtml('a[^1]\n\n[^1]: body\n')
  assert.doesNotMatch(unmarked, /<div class="footnotes">/)
  assert.match(unmarked, /<section role="doc-endnotes"/)
  assert.ok(unmarked.trimEnd().endsWith('</section>'))
})
