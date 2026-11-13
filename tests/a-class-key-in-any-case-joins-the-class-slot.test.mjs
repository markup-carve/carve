/*
 * carve#5991 (ruled option 1): a `class` key in another ASCII case is the class
 * slot on the AST wire too. The model renders the slot from the flat list, so
 * the wire shape in the clause is what makes a round trip render the same.
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
const html = (source) => renderDoc(parse(source)).trim()

test('the clause folds the key into classes and keeps only its spelling', () => {
  assert.match(flat, /its tokens join `attrs\.classes` at their write position/)
  assert.match(flat, /only its spelling stays on the wire, as its `attrs\.order` entry/)
  assert.match(flat, /`\[x\]\(\/u\)\{\.a CLASS=b \.c\}` encodes `"classes":\["a","b","c"\]` and `"order":\["\.class","CLASS"\]`/)
})

test('the key\'s tokens sit between the shorthands around them, in any case', () => {
  for (const key of ['CLASS', 'Class', 'cLaSs', 'class']) {
    assert.equal(html(`[x](/u){.a ${key}=b .c}\n`), '<p><a href="/u" class="a b c">x</a></p>')
    assert.equal(html(`[x]{.a ${key}="b d" .c}\n`), '<p><span class="a b d c">x</span></p>')
  }
  assert.equal(html('[x]{.a cLaSs=b CLASS=d .c}\n'), '<p><span class="a b d c">x</span></p>')
})

test('a first write through the key names the slot', () => {
  assert.equal(html('{CLASS=b .a}\n:::\ny\n:::\n').split('\n')[0], '<div CLASS="b a">')
  assert.equal(html('{.a CLASS=b}\n:::\ny\n:::\n').split('\n')[0], '<div class="a b">')
})
