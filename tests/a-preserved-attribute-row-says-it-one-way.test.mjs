/*
 * The HTML import contract's message template and row set for a preserved
 * attribute, read rather than restated (carve#2279).
 *
 * WHY NOT A BEHAVIOR PROBE. The engines are at three different distances from
 * both halves - two spell a kind-less subject with the word `attribute` in it,
 * and three answer differently on whether a round-trip marker, a semantic span's
 * own key and a list-valued URL attribute owe a row at all - so a probe would
 * pin what the clause refuses. scripts/import-report-claims.mjs carries the gap
 * as pending subjects; this file holds the clause, so the ruling cannot be
 * reworded out of the contract while those entries cite it.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePreservedMessage } from '../scripts/lib/import-report-subjects.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contract = readFileSync(resolve(root, 'docs/html-import-contract.md'), 'utf8')

function clause(heading) {
  const start = contract.indexOf(heading)
  assert.notEqual(start, -1, `${heading} is gone from the import contract`)
  const rest = contract.slice(start + heading.length)
  const end = rest.indexOf('\n## ')
  assert.notEqual(end, -1, `${heading} is no longer followed by another section`)

  return rest.slice(0, end).replace(/\s+/g, ' ')
}

const TEMPLATE = '## A preserved attribute row says it one way'
const ROW_SET = '## Which attributes owe a preserved row'

test('the template names every part of the message and what substitutes into it', () => {
  const body = clause(TEMPLATE)
  assert.match(body, /message is `Preserved <subject> on <tag> <place><reason>`/)
  assert.match(body, /`<tag>` is the element the attribute is written on/)
  assert.match(body, /`in the raw HTML this element is kept as` where that element is the one kept whole/)
  assert.match(body, /`inside the raw HTML <kept> is kept as` where an ancestor is/)
  assert.match(body, /`<reason>` is empty, or `: ` and why the attribute was refused/)
})

test('the subject is the attribute name, a kind takes the word attribute, and a kind-less one does not', () => {
  const body = clause(TEMPLATE)
  assert.match(body, /`<subject>` is the attribute's own name/)
  assert.match(body, /with the kind of attribute it is before the name and the word `attribute` between the two/)
  assert.match(body, /a subject that is the word `attribute` and a name, with no kind in front of it, is neither form/)
})

test('the style clause`s strings stay the head of this template, not whole messages', () => {
  assert.match(clause(TEMPLATE), /The strings the clause above pins are this template's head/)
  // The pinned text plus a place is a conformant message, which is what makes it
  // a head rather than a message (carve-php#2368).
  const parsed = parsePreservedMessage(
    'Preserved style with a denied URL scheme in a declaration value on <form> in the raw HTML this element is kept as',
  )
  assert.deepEqual([parsed.tag, parsed.name, parsed.wellFormed], ['form', 'style', true])
})

test('the dropped row takes the same subject, without a place', () => {
  assert.match(clause(TEMPLATE), /The same subject spells an `attribute-dropped` row, which has no `<place>`: `Dropped <subject> on <tag><reason>`/)
  // Every message the shared fixtures pin for that code already reads this way.
  const fixture = 'Dropped event-handler attribute onclick on <caption>'
  const [, subject] = /^Dropped (.+?) on <[a-z]+>$/.exec(fixture)
  assert.equal(parsePreservedMessage(`Preserved ${subject} on <caption> in the raw HTML this element is kept as`).wellFormed, true)
})

test('the row set is derived from the refusal the rewriting path would make', () => {
  const body = clause(ROW_SET)
  assert.match(body, /one `attribute-preserved` row per attribute the importer would have refused had it rewritten the element/)
  assert.match(body, /plus any whose value the renderer blanks for a denied scheme/)
})

test('an instruction and an owned key are refused in kept bytes; a hardened URL list is not', () => {
  const body = clause(ROW_SET)
  assert.match(body, /consumes as an instruction rather than writing back, or whose key one of the writer's own markers owns, is refused inside kept bytes/)
  assert.match(body, /URL-list attribute under \[CARVE-P9-055\] - is not refused, and owes a row only where a token in its value carries a denied scheme/)
})

test('both clauses example a message the template accepts', () => {
  for (const heading of [TEMPLATE, ROW_SET]) {
    const example = /``` (Preserved [^`]+?) ```/.exec(clause(heading))
    assert.ok(example, `${heading} shows no example message`)
    assert.equal(parsePreservedMessage(example[1].trim())?.wellFormed, true, example[1])
  }
})
