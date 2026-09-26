/*
 * The two interchange-only shapes that had no pinned output now have one on
 * every target, and PART 9 section 13 no longer claims the AST has no section
 * node (carve#2248).
 *
 * Every other shape in the PART 12 interchange run says what comes out.
 * `section` and `table_cell.blocks` were the exception, so carve-rs held both
 * and carve-php held one rather than guess - and a guess is what three engines
 * would otherwise have pinned three different ways in their own tests.
 *
 * The section 13 half is the reason this file is not only a prose check. That
 * clause said "the AST has no `section` node for it to affect" while
 * `resources/ast-schema.json` defined one, so the assertion is conditioned on
 * the schema: the day the node exists, the sentence is a defect. Nothing asked
 * that question before.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(resolve(repo, path), 'utf8')
const grammar = read('resources/grammar.ebnf')
const astSchema = JSON.parse(read('resources/ast-schema.json'))

/* The clause text, from its stable id to the next clause marker. */
const clauseText = (id) => {
  const start = grammar.indexOf(`[${id}]`)
  assert.notEqual(start, -1, `${id} is absent from the grammar`)
  const rest = grammar.slice(start + id.length + 2)
  const end = rest.search(/--\s+NORMATIVE\s+\[CARVE-/)
  return rest.slice(0, end === -1 ? rest.length : end).replace(/\n\s+/g, ' ')
}

/*
 * Every render target the spec names, so a clause that pins three of four fails
 * rather than reading as complete. `carve` is the canonical writer, which both
 * clauses already covered before this change.
 */
const TARGETS = ['HTML', 'Markdown', 'plain', 'ANSI']

for (const id of ['CARVE-P12-049', 'CARVE-P12-052']) {
  test(`${id} pins its output on every render target`, () => {
    const text = clauseText(id)
    const missing = TARGETS.filter((target) => !text.includes(target))
    assert.deepEqual(missing, [], `${id} names no output for: ${missing.join(', ')}`)
  })
}

test('CARVE-P12-049 flattens a block cell to one line under PART 11 section 1b', () => {
  const text = clauseText('CARVE-P12-049')
  assert.match(text, /ONE LINE/, 'the three line-oriented targets need the one-line premise stated')
  assert.match(text, /PART 11 §1b/, 'the flatten must point at the rule that governs an inline-only slot')
  assert.match(text, /field-unspellable/, 'the flatten is a conversion diagnostic, not a render loss')
})

test('CARVE-P12-052 rules out a doubled section wrapper', () => {
  const text = clauseText('CARVE-P12-052')
  assert.match(text, /PART 9 §13/, 'the interaction with the derived wrapper must be stated, not left to a reader')
  assert.match(text, /DOES NOT DOUBLE/, 'a doubled wrapper must be ruled out by name')
  assert.match(text, /`level` renders on NO target/, '`level` needs an answer on every target')
})

test('PART 9 section 13 does not deny a section node the AST schema defines', () => {
  assert.ok(astSchema.$defs.section, 'the premise is gone: the AST schema no longer defines `section`')
  const text = clauseText('CARVE-P9-019')
  assert.doesNotMatch(
    text,
    /AST has no `section` node/,
    'PART 9 §13 denies a node `resources/ast-schema.json` defines',
  )
})

test('the AST schema names the channel both shapes report on', () => {
  for (const type of ['section', 'table_cell']) {
    const description = JSON.stringify(astSchema.$defs[type])
    assert.match(
      description,
      /PART 11 section 1d/,
      `the ${type} description says a loss is reported and must say where`,
    )
    assert.doesNotMatch(description, /reports the loss/, `${type} still reports a loss with no code`)
  }
})
