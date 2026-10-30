/*
 * CARVE-P4-002 and PART 9 §12: the classes a typed div or an admonition adds
 * lead one class list with the authored ones, each value once (carve#4143).
 * CARVE-P9-054: an authored attribute value is probed against the whole URL
 * sink denylist, while text-derived values stay as written (carve#4136).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))

test('an authored class equal to a kind word renders once', () => {
  assert.equal(
    html('{.calculation}\n::: calculation\n42\n:::\n'),
    '<div class="calculation">\n  <p>42</p>\n</div>',
  )
})

test('an authored admonition or type class renders once and keeps the derived order', () => {
  assert.equal(
    html('{.note .admonition .x}\n::: note\n42\n:::\n'),
    '<aside class="admonition note x" aria-label="Note">\n  <p>42</p>\n</aside>',
  )
})

test('an authored attribute value with an OS-handler scheme is blanked', () => {
  assert.equal(
    html('{title="Shell: bash" lang="ms-word:z"}\npara\n'),
    '<p title="" lang="">para</p>',
  )
})

test('a link title and an alt text are text and keep their scheme-like prefix', () => {
  assert.equal(
    html('[a](https://x "Shell: x")\n'),
    '<p><a href="https://x" title="Shell: x">a</a></p>',
  )
  assert.equal(html('![Shell: x](i.png)\n'), '<img src="i.png" alt="Shell: x">')
})
