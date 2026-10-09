/*
 * A conforming parse omits `delim` and `bulletChar` when the author wrote the
 * default (carve#2828).
 *
 * `resources/ast-schema.json` has said "absent means the default" for both
 * fields since they were added, which describes a CONSUMER reading a tree. It
 * left the PRODUCER free to record `.` and `-` anyway, and all three engines
 * did, so one document had two legal spellings and nothing said which a parse
 * owes. `taskState` already answers the same question the other way, in so many
 * words: it is written only on an item whose state is not the default.
 *
 * WHAT THE RULE IS FOR. Not `carve diff` or `carve merge` - both parse their
 * inputs with one parser from source, have no AST-JSON entry point, and so
 * cannot be handed the two spellings at once. The reader at risk is EXTERNAL: a
 * consumer comparing AST JSON across engines, or against a tree stored by an
 * earlier version.
 *
 * THE NON-DEFAULT CONTROLS BELOW ARE THE POINT. "Omit the default" and "drop
 * the field" are one line apart in an encoder and only one of them is the
 * ruling, so `1) x` keeping `")"` and `* x` keeping `"*"` are asserted beside
 * the omission rather than trusted.
 *
 * PIN LAG IS DECLARED, never tolerated - the same rule as
 * resources/engine-pin-drift.txt and the PIN_LAG map in
 * tests/html-import-contract.check.mjs, and it fails in BOTH directions. The
 * pinned build records both defaults; when the engines land the ruling and the
 * pin moves past it, the declaration below goes red and the line goes out with
 * the bump.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, renderCarve, toAstJson } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(resolve(root, 'resources/ast-schema.json'), 'utf8'))

// Declared lag against the `@markup-carve/carve` build package.json pins.
// EMPTY IS THE GOAL: it goes out in the commit that moves the pin past
// markup-carve/carve-js#1511.
const PIN_LAG = 'carve#2828  just landed: the pinned build records `delim: "."` and `bulletChar: "-"`'

const list = (src) => {
  const node = toAstJson(parse(src)).children[0]
  assert.equal(node.type, 'list', `${JSON.stringify(src)} did not parse as a list`)
  return node
}

test('the schema says outright that a parse omits a default marker', () => {
  // The clause rests on these two sentences. A reword that drops the producer
  // half puts this file back to measuring a rule nobody states.
  for (const field of ['delim', 'bulletChar']) {
    assert.match(
      schema.$defs.list.properties[field].description,
      /CONFORMING PARSE OMITS THIS FIELD/,
      `${field} no longer states what a parse owes`,
    )
  }
})

test('a parse omits `delim` on the default `.` marker', () => {
  const node = list('1. Note text.\n')
  if (PIN_LAG) {
    assert.equal(node.delim, '.', `pin lag is declared and the engine no longer has it - delete PIN_LAG: ${PIN_LAG}`)
    return
  }
  assert.ok(!('delim' in node), 'the parse recorded the default ordered delimiter')
})

test('a parse omits `bulletChar` on the default `-` marker', () => {
  const node = list('- item\n')
  if (PIN_LAG) {
    assert.equal(node.bulletChar, '-', `pin lag is declared and the engine no longer has it - delete PIN_LAG: ${PIN_LAG}`)
    return
  }
  assert.ok(!('bulletChar' in node), 'the parse recorded the default bullet character')
})

test('a non-default marker is still recorded, which is what separates this from deleting the fields', () => {
  assert.equal(list('1) Note text.\n').delim, ')')
  assert.equal(list('* item\n').bulletChar, '*')
})

test('omitting the default loses nothing, which is what makes it safe', () => {
  // The asymmetry the ruling turns on: the two spellings describe one document.
  // A writer handed the omitted form has to reach the same source back, or
  // dropping the field would be a loss rather than a normalization.
  for (const src of ['1. Note text.\n', '- item\n', '1) Note text.\n', '* item\n']) {
    assert.equal(renderCarve(parse(src)), src, `${JSON.stringify(src)} is not a fixed point`)
  }
})
