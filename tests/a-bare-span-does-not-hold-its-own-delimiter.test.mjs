/*
 * Every bare delimiter: a span whose content holds its own delimiter between two
 * word characters does not form, and its delimiters stay text (carve#4810).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

for (const [src, out] of [
  ['_my_var_ and *a*b* and /usr/local/', '_my_var_ and *a*b* and /usr/local/'],
  ['~a~b~', '~a~b~'],
  ['/é/é/', '/é/é/'],
  ['/𝐚/𝐛/', '/𝐚/𝐛/'],
  ['=a=b=', '=a=b='],
  ['_snake_case word_', '_snake_case word_'],
  ['*a*b c*', '*a*b c*'],
  ['_a_b_{.k}', '_a_b_{.k}'],
  ['_my_var_ and _x_', '_my_var_ and <u>x</u>'],
  ['*a_b*', '<strong>a_b</strong>'],
  ['_/a/b/_', '<u>/a/b/</u>'],
  ['/x _a_b_ y/', '<em>x _a_b_ y</em>'],
  ['_x *a_b* y_', '_x <strong>a_b</strong> y_'],
  ['_a_', '<u>a</u>'],
  ['*a*', '<strong>a</strong>'],
  ['~a~', '<s>a</s>'],
  ['=a=', '<mark>a</mark>'],
  ['_a _b_', '<u>a _b</u>'],
  ['_a\\_b_', '<u>a_b</u>'],
  ['*a\\*b*', '<strong>a*b</strong>'],
  ['_x `a_b` y_', '<u>x <code>a_b</code> y</u>'],
  ['_see [a_b](u) y_', '<u>see <a href="u">a_b</a> y</u>'],
  ['_x {*a_b*} y_', '<u>x <strong>a_b</strong> y</u>'],
  ['_@a_b_', '<u><span class="mention"><strong>@a_b</strong></span></u>'],
  ['_#a_b_', '<u><span class="tag"><strong>#a_b</strong></span></u>'],
  ['{_my_var_}', '<u>my_var</u>'],
  ['{*a*b*}', '<strong>a*b</strong>'],
]) {
  test(`${src} renders ${out}`, () => {
    assert.equal(html(`${src}\n`), `<p>${out}</p>`)
  })
}

test('a declined span does not hide a caption placeholder', () => {
  assert.ok(html('![p](p.png)\n^ _a_b # c_\n').includes('<figcaption>_a_b 1 c_</figcaption>'))
  assert.ok(html('![p](p.png)\n^ *a*b # c*\n').includes('<figcaption>*a*b 1 c*</figcaption>'))
  assert.ok(html('![p](p.png)\n^ _a # b_\n').includes('<figcaption><u>a # b</u></figcaption>'))
})
