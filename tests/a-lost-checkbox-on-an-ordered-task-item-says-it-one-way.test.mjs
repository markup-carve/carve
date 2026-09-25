/*
 * The import contract's message for an ordered task item's lost checkbox, read
 * rather than restated (carve-js#2062).
 *
 * The row already agreed across three engines on each entry point and said two
 * different things across the two, because nothing pinned the string: carve-js
 * #2053 wrote one sentence on the HTML side and carve-js#2064, carve-php#2366
 * and carve-rs#1928 wrote a shorter one on the Markdown side. Neither was wrong
 * against anything written down, which is why it took a ruling rather than a fix.
 *
 * WHY NOT A BEHAVIOR PROBE. The engines reach the pinned string one at a time,
 * and the spec repo imports HTML through the carve-js version package.json pins,
 * so a probe here would fail on the published engine while the ruling was being
 * rolled out and pass afterwards for a reason that has nothing to do with the
 * clause. This file holds the clause so the wording cannot leave the contract;
 * each engine's own test holds its row.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contract = readFileSync(resolve(root, 'docs/html-import-contract.md'), 'utf8')
const bridges = readFileSync(resolve(root, 'docs/format-bridges.md'), 'utf8')

const HEADING = '## A lost checkbox on an ordered task item says it one way'
const MESSAGE = 'An ordered task item is not spellable as a Carve task item; the checkbox marker was kept as text'

function clause(heading, page = contract) {
  const start = page.indexOf(heading)
  assert.notEqual(start, -1, `${heading} is gone from the import contract`)
  const rest = page.slice(start + heading.length)
  const end = rest.indexOf('\n## ')
  assert.notEqual(end, -1, `${heading} is no longer followed by another section`)

  return rest.slice(0, end)
}

test('the clause pins the message as its own fenced block, byte for byte', () => {
  const fenced = clause(HEADING).match(/```\n([^`]*?)\n```/)
  assert.ok(fenced, 'the clause shows no fenced message')
  assert.equal(fenced[1], MESSAGE)
})

test('one message covers every entry point that reaches the loss', () => {
  const body = clause(HEADING).replace(/\s+/g, ' ')
  assert.match(body, /carries one message at every entry point/)
  assert.match(body, /a consumer filtering on the message does not have to know which importer ran/)
  // The one field that legitimately differs between the two, so that a reader
  // does not read "one message" as "one identical row".
  assert.match(body, /The row's `path` still differs/)
})

test('the clause the row used to restate is here instead of in the row', () => {
  const body = clause(HEADING).replace(/\s+/g, ' ')
  assert.match(body, /`task_marker` hangs off `unordered_item` alone in `resources\/spec\/03-blocks-core\.ebnf`/)
  assert.match(body, /the item keeps the characters the box was read from, in the position the box stood, and loses the task-item semantics/)
  assert.match(body, /A row says what happened to this document/)
  // The production the sentence reads off, so a grammar change that moves
  // `task_marker` cannot leave the prose describing the old shape.
  const grammar = readFileSync(resolve(root, 'resources/spec/03-blocks-core.ebnf'), 'utf8')
  const items = grammar.split('\n').filter((line) => /^\w+_item\s*=/.test(line) && line.includes('task_marker'))
  assert.deepEqual(items.map((line) => line.split('=')[0].trim()), ['unordered_item'])
})

test('the clause does not restate the fields format bridges already fixes', () => {
  const body = clause(HEADING).replace(/\s+/g, ' ')
  assert.match(body, /Its remaining fields are fixed in \[format bridges\]\(\.\/format-bridges#a-bridge-reports-it-never-guesses\)/)
  assert.match(body, /`dropped` fidelity at `exact` confidence, beside `fidelity-unverified`/)
  // And the page it points at owes the pointer back, so the Markdown half of
  // the row is one link from the string rather than free to grow its own.
  assert.match(
    bridges.replace(/\s+/g, ' '),
    /Its message is pinned once, for every entry point that reaches the loss, under \[a lost checkbox on an ordered task item\]\(\.\/html-import-contract#a-lost-checkbox-on-an-ordered-task-item-says-it-one-way\)/,
  )
})

test('a position with no checkbox to lose owes no row', () => {
  const body = clause(HEADING).replace(/\s+/g, ' ')
  assert.match(body, /A position the source format reads no checkbox at owes no row/)
  for (const position of ['> - [ ] a', '- - [ ] a', '1. - [ ] a']) {
    assert.ok(body.includes(`\`${position}\``), `${position} is no longer named as a position that owes nothing`)
  }
  assert.match(body, /reporting a loss that did not happen is the same defect as staying silent about one that did/)
})

test('the pinned message says nothing a grep for the old wording would find', () => {
  // The HTML string's distinguishing clause. Its explanation moved into the
  // prose above, so finding it back inside a fenced message means a row went
  // back to restating the grammar.
  assert.ok(!MESSAGE.includes('spelled behind a bullet only'))
  assert.match(clause(HEADING).replace(/\s+/g, ' '), /rather than in every row that hits it/)
})
