// CARVE-P4-007 and carve#4205: a `class=V` value is a list of class tokens.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('the dedup compares the tokens of a class value', () => {
  assert.equal(html('{class="a b" .a}\npara\n'), '<p class="a b">para</p>')
  assert.equal(html('[x]{.b class="a\tb  a"}\n'), '<p><span class="b a">x</span></p>')
  assert.equal(html('{.b}\n{class="a b"}\npara\n'), '<p class="b a">para</p>')
})

test('a value with no token stays one entry', () => {
  assert.equal(html('{class=""}\npara\n'), '<p class="">para</p>')
})

test('each token is hardened on its own', () => {
  assert.equal(html('{class="javascript:x y"}\npara\n'), '<p class="y">para</p>')
})
