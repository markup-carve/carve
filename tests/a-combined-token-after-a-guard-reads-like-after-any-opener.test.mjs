import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src + '\n')).trim()

// A `_` that opens a span that closes is not the character before the `*`
// after it, so a combined token there reads as after `=` or `~` (carve#3941).
for (const [src, out] of [
  ['_*/*a*/_', '<p><u><strong>/*a</strong>/</u></p>'],
  ['_*/*a*/ b_', '<p><u><strong>/*a</strong>/ b</u></p>'],
  ['=*/*a*/ b=', '<p><mark><strong>/*a</strong>/ b</mark></p>'],
  ['_*/*a*/', '<p>_*<strong><em>a</em></strong></p>'],
  ['_*/*a*/* b', '<p>_*<strong><em>a</em></strong>* b</p>'],
  ['__*_/*a*/**__', '<p>__*<u><strong><em>a</em></strong>**</u>_</p>'],
]) {
  test(`guarded opener before a combined token: ${src}`, () => assert.equal(html(src), out))
}

// A combined token read as single delimiters still renders a `/*` ... `*/`
// pair as strong around em, a leading `*/` in it is two delimiters, and its
// content runs on the enclosing stack under E3.
for (const [src, out] of [
  ['*/*/*a*/', '<p><strong>/</strong><strong><em>a</em></strong></p>'],
  ['*/*/*a*/{.c}', '<p><strong>/</strong><strong class="c"><em>a</em></strong></p>'],
  ['_/**/*a*/ /', '<p>_/**<strong><em>a</em></strong> /</p>'],
  ['x _/*_a_*/_', '<p>x <u>/*_a</u>*/_</p>'],
  ['_*/*_a_*/ b*', '<p><u><strong>/</strong>_a</u>*/ b*</p>'],
  ['x _/*/*_a_*/_', '<p>x <u><em>*</em>*_a</u>*/_</p>'],
  ['/*a _b_ c*/ x', '<p><strong><em>a <u>b</u> c</em></strong> x</p>'],
]) {
  test(`split combined token: ${src}`, () => assert.equal(html(src), out))
}
