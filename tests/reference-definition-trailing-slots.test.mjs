/*
 * The executable reference definition follows `reference_definition` in its
 * two trailing slots: `link_title` takes either quote form, and `[space,
 * attributes]` takes only a block the `attributes` production accepts
 * (CARVE-P3-006). No corpus document reaches these shapes, so
 * scripts/formal-core-check.mjs cannot see them (carve#2122).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const resolved = (def) => renderDoc(parse(`${def}\n\n[x][a]\n`))

test('a single-quoted title is a link_title', () => {
  assert.equal(resolved("[a]: /u 'T'"), '<p><a href="/u" title="T">x</a></p>')
  assert.equal(resolved("[a]: /u 'a\\'b'"), '<p><a href="/u" title="a&apos;b">x</a></p>')
  assert.equal(resolved("[a]: /u 'T' {.c}"), '<p><a href="/u" title="T" class="c">x</a></p>')
})

for (const block of ['{#}', '{ }', '{=}', '{a:b}', '{.c}{.d}']) {
  test(`an invalid trailing block ${block} makes the line prose`, () => {
    const out = resolved(`[a]: /u ${block}`)
    assert.equal(out, `<p>[a]: /u ${block}</p>\n<p>[x][a]</p>`)
  })
}

test('a brace or quote in the destination does not hide the trailing block', () => {
  assert.equal(resolved('[a]: /u{x} {.c}'), '<p><a href="/u{x}" class="c">x</a></p>')
  assert.equal(resolved("[a]: it's {.c}"), '<p><a href="it&apos;s" class="c">x</a></p>')
})

test('the slot shapes the production already settled still hold', () => {
  assert.equal(resolved('[a]: /u {.c}'), '<p><a href="/u" class="c">x</a></p>')
  assert.equal(resolved('[a]: /u{.c}'), '<p><a href="/u{.c}">x</a></p>')
  assert.equal(resolved('[a]: /u {data-x="}"}'), '<p><a href="/u" data-x="}">x</a></p>')
  assert.equal(resolved('[a]: /u  {.c}'), '<p>[a]: /u  {.c}</p>\n<p>[x][a]</p>')
  assert.equal(resolved('[a]: /u "T"{.c}'), '<p>[a]: /u “T”{.c}</p>\n<p>[x][a]</p>')
})
