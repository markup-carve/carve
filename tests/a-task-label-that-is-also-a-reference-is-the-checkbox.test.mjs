/*
 * PART 9 §14's CARVE-P9-074 (carve#2273), read AND run.
 *
 * The clause half pins the four things the ruling turned on: which reader wins,
 * that the checkbox is what it reads, that the definition goes unused, and that
 * the unused definition's absence from the written Carve is not a defect. Each
 * is asserted on its own, because dropping any one leaves a clause that reads
 * complete and settles a different question - and the last one is the only
 * reason a byte comparison of the written `.crv` would be wrong here.
 *
 * The behavior half runs the executable spec on the CARVE side. Carve has no
 * shortcut reference link, so the reading the importer is told to take is the
 * one Carve's own grammar already gives the same bytes: a task item, with the
 * definition rendering nothing. That is what makes writing the definition
 * through safe, and a Carve reader that resolved `[x]` instead would make the
 * ruled import lossy at the next hop.
 *
 * The ordered form is markup-carve/carve-rs#1886 and is not asserted here.
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
  const start = grammar.indexOf('A MARKDOWN LABEL THAT IS BOTH A CHECKBOX AND A DEFINED REFERENCE')
  assert.notEqual(start, -1, 'CARVE-P9-074 is gone from the grammar')
  const rest = grammar.slice(start)
  const end = rest.indexOf('EMPTY OR INVALID ATTRIBUTE BLOCK')
  assert.notEqual(end, -1, 'CARVE-P9-074 no longer sits above CARVE-P9-021')
  return rest.slice(0, end)
}

test('the clause carries its id and names the reader that decides', () => {
  const body = clause()
  assert.match(body, /\[CARVE-P9-074\]/)
  assert.match(body, /cmark-gfm 0\.29\.0\.gfm\.13/)
})

test('the clause says the checkbox wins and the definition goes unused', () => {
  const body = clause()
  assert.match(body, /TASK ITEM/)
  assert.match(body, /definition UNUSED/)
})

test('the clause says a dropped definition is not a loss', () => {
  const body = clause()
  assert.match(body, /write it through or omit\s+it/)
  assert.match(body, /not a reported loss/)
})

test('the ambiguity is named as Markdown-only', () => {
  // The shortcut form is what makes the source ambiguous, and PART 9 §14 says
  // directly above this clause that Carve has none. A clause that did not say
  // where the ambiguity lives would read as if Carve had the same two readings.
  const body = clause()
  assert.match(body, /Markdown HAS the shortcut form/)
  assert.match(
    grammar,
    /Carve has no shortcut reference link: a bare `\[label\]`\s+never resolves against a `\[label\]: url` definition\./,
  )
})

test('Carve reads the same bytes as a task item, whatever is defined', () => {
  const withDefinition = oracleHtml('- [x] done\n\n[x]: /u\n')
  assert.match(withDefinition, /<input type="checkbox" checked disabled aria-label="done"> done/)
  // The definition is document metadata and renders nothing, which is the half
  // that makes writing the author's bytes through safe.
  assert.doesNotMatch(withDefinition, /href="\/u"/)
  assert.doesNotMatch(withDefinition, /\[x\]/)

  // Omitting the definition is the other faithful spelling, so it must render
  // the same document. If these two ever differ, "its absence is not a defect"
  // stops being true.
  assert.equal(oracleHtml('- [x] done\n'), withDefinition)
})
