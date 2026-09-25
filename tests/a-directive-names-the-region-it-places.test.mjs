/*
 * PART 9 §12's CARVE-P9-072, read rather than restated (carve#2264).
 *
 * WHY NOT A BEHAVIOR PROBE. The pinned build publishes `directive` with both
 * fields, and renders the PRE-RULING shape: the title as a sibling paragraph
 * before the placed `<section>`, the label dropped. Probing the ruled shape
 * would fail here and pass only once carve-js ships the fix and the pin moves
 * again, and snapshotting what the pin renders today would bake the shape this
 * clause refuses into a golden. The corpus case lands with that later pin
 * (carve#2264); until then this reads the clause, so the ruling cannot be
 * reworded out of the spec while the engine tickets still cite it.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

function clause() {
  const start = grammar.indexOf("A DIRECTIVE'S TITLE AND LABEL RENDER INSIDE THE REGION IT PLACES")
  assert.notEqual(start, -1, 'CARVE-P9-072 is gone from the grammar')
  const rest = grammar.slice(start)
  const end = rest.indexOf('\n   13. HEADING SECTION WRAPPING')
  assert.notEqual(end, -1, 'CARVE-P9-072 no longer sits at the end of PART 9 §12')
  return rest.slice(0, end)
}

test('the clause carries its id and puts both tokens inside the placed element', () => {
  const body = clause()
  assert.match(body, /\[CARVE-P9-072\]/)
  assert.match(body, /FIRST CHILDREN of\s+THAT element, title before label/)
  assert.match(body, /<p class="admonition-title" id="adm-1">Notes<\/p>/)
  assert.match(body, /<p class="div-label">End<\/p>/)
})

test('the clause names the region and refuses the sibling shape', () => {
  const body = clause()
  assert.match(body, /aria-labelledby="adm-1"/)
  assert.match(body, /A SIBLING TITLE WAS REFUSED/)
  assert.match(body, /THE SEPARATOR DOES NOT MOVE/)
  assert.match(body, /A DEGRADED MARKER CARRIES THEM TOO/)
})

test('the clause mints from one id sequence and names only what can be named', () => {
  const body = clause()
  assert.match(body, /THE ID COMES FROM THE ADMONITION SEQUENCE, NOT A SECOND ONE/)
  assert.match(body, /THE NEXT n IN\s+THAT SAME SEQUENCE/)
  assert.match(body, /PROHIBITED on role `generic`/)
  assert.match(body, /takes NEITHER naming attribute and mints NO id/)
})

test('an author-written name still wins, and only a naming attribute does', () => {
  const body = clause()
  assert.match(body, /author's own `aria-label` or `aria-labelledby` still wins/)
  assert.match(body, /any OTHER `aria-\*`\s+the author writes leaves the naming alone/)
  assert.match(body, /WHERE THE MARKER'S ATTRIBUTES REACH\s+THE PLACED ELEMENT/)
})

test('a kind whose element cannot hold a paragraph keeps the tokens before it', () => {
  const body = clause()
  assert.match(body, /WHERE THE ELEMENT CANNOT HOLD A PARAGRAPH, THE TOKENS PRECEDE IT/)
  assert.match(body, /`glossary` places one `<dl>`/)
  assert.match(body, /IMMEDIATELY BEFORE the generated\s+content and mint no id/)
})

test('a kind whose element cannot hold a paragraph keeps the tokens before it', () => {
  const body = clause()
  assert.match(body, /WHERE THE ELEMENT CANNOT HOLD A PARAGRAPH, THE TOKENS PRECEDE IT/)
  assert.match(body, /`glossary` places one `<dl>`/)
  assert.match(body, /IMMEDIATELY BEFORE the generated\s+content and mint no id/)
})

test('the clause leaves an untitled marker byte-identical', () => {
  assert.match(
    clause(),
    /untitled, unlabeled marker renders EXACTLY as it did before this clause/,
  )
})
