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
// A typed container carries a wrapper class of its own, so it builds the slot
// itself instead of handing the whole list to the merge. Tier-1 gives an
// `<aside>`, any other type word a `<div>`; one branch serves both.
const admonition = (attrs) => openerOf(`{${attrs}}\n::: note\ny\n:::\n`)
const typed = (attrs) => openerOf(`{${attrs}}\n::: sidebar\ny\n:::\n`)
// Two inline carriers build the slot themselves for the same reason: a math
// span prepends `math inline|display` and the `ext-NAME` fallback prepends
// `ext-<name>`. Both are wrapped in a paragraph, so take the span opener.
const spanOpenerOf = (source) => openerOf(source).match(/<span[^>]*>/)[0]
const mathSpan = (attrs) => spanOpenerOf('$`x`{' + attrs + '}\n')
const displayMath = (attrs) => spanOpenerOf('$$`x`{' + attrs + '}\n')
const extSpan = (attrs) => spanOpenerOf(`:widget[x]{${attrs}}\n`)

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

/* The wrapper class is the same slot, so every spelling merges into it. The
 * key-value and boolean forms used to reach the second pass with the slot
 * already claimed, which wrote a second `class` attribute (carve#2457). */
test('a typed container folds every spelling into its wrapper class', () => {
  assert.equal(admonition('.b'), '<aside class="admonition note b" aria-label="Note">')
  assert.equal(admonition('class=b'), '<aside class="admonition note b" aria-label="Note">')
  assert.equal(typed('.b'), '<div class="sidebar b">')
  assert.equal(typed('class=b'), '<div class="sidebar b">')
})

/* The wrapper class leads and the author's follow in source order, whichever
 * spelling each one used. */
test('the wrapper class leads and the spellings interleave in source order', () => {
  assert.equal(admonition('class=b .c'), '<aside class="admonition note b c" aria-label="Note">')
  assert.equal(admonition('.c class=b'), '<aside class="admonition note c b" aria-label="Note">')
  assert.equal(typed('#i class=b k=v .c'), '<div class="sidebar b c" id="i" k="v">')
  assert.equal(typed('class=a class=b'), '<div class="sidebar a b">')
  assert.equal(typed('class=a .a'), '<div class="sidebar a">')
})

/* An empty or refused value claims the slot and contributes no token, so it
 * leaves the wrapper class alone rather than appending a blank. */
test('an empty or refused value adds no token to the wrapper class', () => {
  assert.equal(admonition('class'), '<aside class="admonition note" aria-label="Note">')
  assert.equal(admonition('class .b'), '<aside class="admonition note b" aria-label="Note">')
  assert.equal(typed('class="javascript:alert(1)"'), '<div class="sidebar">')
  assert.equal(typed('class="javascript:alert(1)" .b'), '<div class="sidebar b">')
})

/* Control: an id named `class` is not a class on a typed container either. */
test('an id named class stays an id on a typed container', () => {
  assert.equal(typed('#class .b'), '<div class="sidebar b" id="class">')
})

/* A math span carried the same defect and wrote `class` twice. Its loop tested
 * the shorthand tuple, so the key-value and boolean spellings reached the
 * generic branch with the slot already emitted (carve#2460). */
test('a math span folds every spelling into its base class', () => {
  assert.equal(mathSpan('.b'), '<span class="math inline b" role="math">')
  assert.equal(mathSpan('class=b'), '<span class="math inline b" role="math">')
  assert.equal(mathSpan('class=a class=b'), '<span class="math inline a b" role="math">')
  assert.equal(mathSpan('class=a .a'), '<span class="math inline a" role="math">')
  assert.equal(mathSpan('class'), '<span class="math inline" role="math">')
  assert.equal(mathSpan('class="javascript:alert(1)"'), '<span class="math inline" role="math">')
  assert.equal(displayMath('class=b'), '<span class="math display b" role="math">')
})

/* PART 10 §1: the base class sits INSIDE the slot, and the slot keeps the
 * first-appearance position, so an id written before any class stays first. */
test('a math span keeps the slot at the first class whichever spelling opens it', () => {
  assert.equal(mathSpan('#i class=b'), '<span id="i" class="math inline b" role="math">')
  assert.equal(mathSpan('#i class=b k=v .c'), '<span id="i" class="math inline b c" k="v" role="math">')
  assert.equal(mathSpan('.b class=a'), '<span class="math inline b a" role="math">')
})

/* The `ext-NAME` fallback found the author's first class with the tuple tag, so
 * the key-value spelling put the whole slot ahead of an earlier id, undoing
 * carve#1164 for that spelling. */
test('an ext-NAME span keeps the slot at the first class whichever spelling opens it', () => {
  assert.equal(extSpan('#i .b'), '<span id="i" class="ext-widget b">')
  assert.equal(extSpan('#i class=b'), '<span id="i" class="ext-widget b">')
  assert.equal(extSpan('#i class'), '<span id="i" class="ext-widget">')
  assert.equal(extSpan('#i class=b k=v .c'), '<span id="i" class="ext-widget b c" k="v">')
  assert.equal(extSpan('class=a .b'), '<span class="ext-widget a b">')
})

/* Controls: an id named `class` is not a class on either inline carrier, and a
 * class named `class` is one. Both hold with and without the fix. */
test('an id named class stays an id on the inline base-class carriers', () => {
  assert.equal(mathSpan('#class .b'), '<span id="class" class="math inline b" role="math">')
  assert.equal(extSpan('#class .b'), '<span id="class" class="ext-widget b">')
  assert.equal(mathSpan('.class'), '<span class="math inline class" role="math">')
  assert.equal(extSpan('.class'), '<span class="ext-widget class">')
})

test('no shape renders the class attribute twice', () => {
  const shapes = [
    'class', 'class class=a', 'class=a class', 'class .b', '#class', '#class .b',
    '.class', 'class=a .b', '.b class=a', 'class=a class=b', 'class=a .a',
  ]
  // Every carrier that builds a class attribute of its own, so the next one
  // someone adds is caught here rather than by a reader (carve#2457, carve#2460).
  for (const draw of [container, admonition, typed, mathSpan, displayMath, extSpan]) {
    for (const attrs of shapes) {
      const opener = draw(attrs)
      assert.equal((opener.match(/class=/g) ?? []).length <= 1, true, `${attrs} -> ${opener}`)
    }
  }
})

test('a glued inline run merges across its blocks', () => {
  assert.equal(openerOf('*x*{class=a}{.b}\n'), '<p><strong class="a b">x</strong></p>')
})
