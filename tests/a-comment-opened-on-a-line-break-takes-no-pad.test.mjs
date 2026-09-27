/*
 * PART 9 §21a on the pad space a canonical writer puts after `{%`
 * (carve#2425). Three engines picked two spellings while the clause said
 * nothing, so the clause is asserted here beside the behavior it rules.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToCarve } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

const RULED = 'a {%\nA b\n %} c\n'

test('the clause refuses the pad where the text begins with a line break', () => {
  assert.match(grammar, /NO PAD AGAINST A LEADING LINE BREAK/)
  assert.match(grammar, /except where the text begins\n +with a line break/)
})

test('the writer writes the ruled spelling and rewrites the padded one to it', () => {
  assert.equal(carveToCarve(RULED), RULED)
  assert.equal(carveToCarve('a {% \nA b\n %} c\n'), RULED)
})

test('no line of the ruled spelling ends in whitespace', () => {
  for (const line of RULED.split('\n')) assert.equal(line, line.replace(/\s+$/, ''))
})

/* The pad on the CLOSING side is unaffected: there the space opens a line
 * rather than ending one, and nothing ruled it away. */
test('a text ending in a line break still takes the closing pad', () => {
  assert.equal(carveToCarve('a {% b\n%} c\n'), 'a {% b\n %} c\n')
})
