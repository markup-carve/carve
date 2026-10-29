import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src + '\n')).trim()

// PART 9 E3: the `*` of `_*` is open when `/*` arrives, whether or not the `_`
// closes later, so the combined token reads as two delimiters (carve#3947).
for (const [src, out] of [
  ['_*`/`/*{c_}*/', '<p>_<strong c_=""><code>/</code>/</strong>*/</p>'],
  ['_*`/`/*{t=a*/}*/', '<p>_<strong t="a*/"><code>/</code>/</strong>*/</p>'],
  ['_*/*a**/', '<p>_<strong>/*a</strong>*/</p>'],
  ['_/a /*a**/', '<p>_<em>a /<strong>a</strong>*</em></p>'],
  ['_*/*a*/', '<p>_<strong>/*a</strong>/</p>'],
]) {
  test(`an opener before a combined token is open where it stands: ${src}`, () => assert.equal(html(src), out))
}

// A block glued to the split token's `*` attaches to the span that `*` closes,
// and the content after the block keeps its delimiters.
for (const [src, out] of [
  ['_*/*{c}_*/', '<p><u><strong c="">/</strong></u>*/</p>'],
  ['_*`/`/*{c}_*/_', '<p><u><strong c=""><code>/</code>/</strong></u>*/_</p>'],
  ['b *//*{c} _x_*/', '<p>b <strong c="">//</strong> <u>x</u>*/</p>'],
]) {
  test(`a block on a split combined token keeps the content after it: ${src}`, () => assert.equal(html(src), out))
}
