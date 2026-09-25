/*
 * The HTML import contract's `style` clause, read rather than restated
 * (carve#2267).
 *
 * WHY NOT A BEHAVIOR PROBE. No engine routes `style` through the refusal policy
 * yet - all three answer `style-unmapped` inside kept bytes - so a probe would
 * pin the shape the clause refuses. scripts/import-report-claims.mjs carries
 * that gap as a pending clause with a ticket per engine; this file holds the
 * clause itself, so the ruling cannot be reworded out of the contract while
 * those tickets cite it.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contract = readFileSync(resolve(root, 'docs/html-import-contract.md'), 'utf8')

const HEADING = '## A refused declaration in `style` is a refused attribute'

function clause() {
  const start = contract.indexOf(HEADING)
  assert.notEqual(start, -1, 'the `style` clause is gone from the import contract')
  const rest = contract.slice(start + HEADING.length)
  const end = rest.indexOf('\n## ')
  assert.notEqual(end, -1, 'the `style` clause is no longer followed by another section')
  return rest.slice(0, end)
}

test('the clause routes style through the refusal policy, inside kept bytes', () => {
  const body = clause()
  assert.match(body, /reads `style` through the same refusal policy as every other\nattribute/)
  assert.match(body, /Inside an element `roundtrip` keeps as raw HTML/)
})

test('the code is attribute-preserved and style-unmapped is refused there', () => {
  const body = clause()
  assert.match(body, /reported as `attribute-preserved` and never as `style-unmapped`/)
  assert.match(body, /names a\nmapping kept bytes do not run/)
})

test('the class is error for the two refused reasons and info otherwise', () => {
  const body = clause()
  assert.match(body, /at `error` where a declaration carries a denied\nURL scheme in `url\(\.\.\.\)`/)
  assert.match(body, /a construct the CSS sanitizer refuses such as\n`expression\(\.\.\.\)`/)
  assert.match(body, /and at `info` otherwise/)
})

test('the clause pins both message strings and what substitutes into them', () => {
  const body = clause()
  // The template is the refused declaration's, not benign CSS's: both strings
  // name a refusal reason, so neither can describe a row the clause puts at
  // `info`.
  // Read with the soft wraps collapsed: the strings are pinned, where the
  // paragraph happens to break is not.
  const flat = body.replace(/\s+/g, ' ')
  assert.match(flat, /A refused declaration's message is `Preserved style with a denied URL scheme in a declaration value on <form>` or `Preserved style with a construct the CSS sanitizer refuses on <form>`/)
  assert.match(flat, /the element's own tag substituted/)
})

test('nothing is removed, so the clause sits under the carve#2261 exemption', () => {
  const body = clause()
  assert.doesNotMatch(body, /\bremove[ds]?\b/)
  assert.doesNotMatch(body, /\bstrip/)
  assert.match(contract, /the bytes stay whole and each refused\nattribute is reported as `attribute-preserved` instead \(carve#2261\)/)
})

test('the CSS policy sends kept bytes to this clause instead of style-unmapped', () => {
  clause()
  assert.match(
    contract,
    /`style-unmapped` in `semantic` and `roundtrip` modes, except inside bytes kept\nwhole under `raw-preserved`, where \["a refused declaration in `style` is a\nrefused attribute"\]\(#a-refused-declaration-in-style-is-a-refused-attribute\)\ngoverns\./,
  )
})
