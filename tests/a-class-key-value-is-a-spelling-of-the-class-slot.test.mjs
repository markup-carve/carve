/*
 * CARVE-P4-007 (carve#2438, carve#2439), asserted against the executable spec.
 * The clause landed with the ruling and the oracle still emitted `class` twice,
 * which no HTML parser reads as two classes.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const flat = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8').replace(/\s+/g, ' ')

const openerOf = (source) => renderDoc(parse(source)).trim().split('\n')[0]
const container = (attrs) => openerOf(`{${attrs}}\n:::\ny\n:::\n`)

test('the clause says the two spellings are one attribute in one slot', () => {
  assert.match(flat, /A `class` KEY-VALUE IS A SPELLING OF THE CLASS SLOT/)
  assert.match(flat, /APPENDS the value to the AST's `attrs\.classes` in source order/)
  assert.match(flat, /writes nothing to `attrs\.keyValues`/)
})

test('one class attribute, at the position of the first class', () => {
  assert.equal(container('class=a .b'), '<div class="a b">')
  assert.equal(container('.b class=a'), '<div class="b a">')
  assert.equal(container('#i class=a k=v .b'), '<div id="i" class="a b" k="v">')
})

/* This one held before the merge too: a lone `class=foo` reached the same
 * attribute down either path. It pins the clause's sentence, not the merge. */
test('the two spellings of one value parse to one tree', () => {
  assert.equal(container('class=foo'), container('.foo'))
})

/* The clause APPENDS, so two key-values accumulate rather than the second
 * replacing the first the way a repeated ordinary key does. */
test('a repeated class key-value accumulates, and an equal value dedups', () => {
  assert.equal(container('class=a class=b'), '<div class="a b">')
  assert.equal(container('class=a .a'), '<div class="a">')
})

/* The key-value form reaches classes the `.` shorthand cannot spell, which is
 * why carve#2435 needs it. */
test('a value outside explicit_identifier is still a class', () => {
  assert.equal(container('class=-col'), '<div class="-col">')
  assert.equal(container('class=w-1/2 .b'), '<div class="w-1/2 b">')
})

/* Merging into the class slot must not lose `hardenAttr`, which every
 * key/value passes and which blanks a value the URL sink check refuses. */
test('a refused value is still blanked and contributes no class', () => {
  assert.equal(container('class="javascript:alert(1)"'), '<div class="">')
  assert.equal(container('class="javascript:alert(1)" .b'), '<div class="b">')
})

/* A bare `class` is `class=""` under PART 4's boolean rule, so it claims the
 * same slot. Merging only the key-value spelling left it emitting the second
 * attribute this clause exists to remove. */
test('the boolean spelling claims the slot too', () => {
  assert.equal(container('class'), '<div class="">')
  assert.equal(container('class class=a'), '<div class="a">')
  assert.equal(container('class=a class'), '<div class="a">')
  assert.equal(container('class .b'), '<div class="b">')
})

/* Control: an id whose value happens to be `class` is not a class. */
test('an id named class stays an id', () => {
  assert.equal(container('#class'), '<div id="class">')
  assert.equal(container('#class .b'), '<div id="class" class="b">')
  assert.equal(container('.class'), '<div class="class">')
})

test('no shape renders the class attribute twice', () => {
  for (const attrs of [
    'class', 'class class=a', 'class=a class', 'class .b', '#class', '#class .b',
    '.class', 'class=a .b', '.b class=a', 'class=a class=b', 'class=a .a',
  ]) {
    const opener = container(attrs)
    assert.equal((opener.match(/class=/g) ?? []).length <= 1, true, `${attrs} -> ${opener}`)
  }
})

test('a glued inline run merges across its blocks', () => {
  assert.equal(openerOf('*x*{class=a}{.b}\n'), '<p><strong class="a b">x</strong></p>')
})
