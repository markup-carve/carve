/*
 * PART 8 ranks emphasis closers above smart typography, so an `=` inside a
 * typographic arrow closes an open highlight (#3997). A tag or mention name
 * may be the `_` that stands against a brace (#3996). A literal include
 * directive is no atom for pairing (#4007).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a forced highlight closer ends an arrow', () => {
  assert.equal(html('{=a>=}\n'), '<p><mark>a&gt;</mark></p>')
  assert.equal(html('{=a!=}\n'), '<p><mark>a!</mark></p>')
  assert.equal(html('{=a<==}\n'), '<p><mark>a≤</mark></p>')
  assert.equal(html('{=a>=}{.c}\n'), '<p><mark class="c">a&gt;</mark></p>')
  assert.equal(html('{=a ==> b=}\n'), '<p><mark>a ⇒ b</mark></p>')
  // Another kind's closer leaves the arrow whole.
  assert.equal(html('{*a>=}*}\n'), '<p><strong>a≥}</strong></p>')
})

test('the first = of an arrow that can close a bare highlight closes it', () => {
  // The = of a comparison `!=`, `<=` or `>=` never closes (PART 9 §9, #4131, #4177).
  assert.equal(html('=a>=\n'), '<p>=a≥</p>')
  assert.equal(html('=a<== b\n'), '<p><mark>a&lt;</mark>= b</p>')
  assert.equal(html('=a<=> b\n'), '<p><mark>a&lt;</mark>&gt; b</p>')
  assert.equal(html('=a ==> b=\n'), '<p><mark>a =</mark>&gt; b=</p>')
  assert.equal(html('=a<=>=\n'), '<p><mark>a&lt;</mark>≥</p>')
  assert.equal(html('=a!={.c} x\n'), '<p>=a≠{.c} x</p>')
  // No open highlight, or no valid closer: the arrow stands.
  assert.equal(html('a >= b\n'), '<p>a ≥ b</p>')
  assert.equal(html('=a>=b\n'), '<p>=a≥b</p>')
  assert.equal(html('a >=b= c\n'), '<p>a ≥b= c</p>')
})

test('a name may be the underscore against a brace', () => {
  assert.equal(html('a {#_} b\n'), '<p>a {<span class="tag"><strong>#_</strong></span>} b</p>')
  assert.equal(html('a {@_} b\n'), '<p>a {<span class="mention"><strong>@_</strong></span>} b</p>')
  // A closer that takes the underscore leaves no name.
  assert.equal(html('{_#_}\n'), '<p><u>#</u></p>')
  assert.equal(html('{_@_}\n'), '<p><u>@</u></p>')
  // A marker that is no tag hands the underscore back to the stack.
  assert.equal(html('x_#_}_\n'), '<p>x_#<u>}</u></p>')
  // Inside a forced underline the underscore before a block is name.
  assert.equal(html('{_@a_b_{.c}_}\n'), '<p><u><span class="mention"><strong>@a_b_</strong></span>{.c}</u></p>')
})

test('an opener before a literal directive closes inside it', () => {
  assert.equal(html('_a {{ ab_.csv @lines:2-1 }} tail\n'),
    '<p><u>a {{ ab</u>.csv <span class="mention"><strong>@lines</strong></span>:2-1 }} tail</p>')
  // A span holding its own delimiter between word characters does not form (carve#4810).
  assert.equal(html('_a {{ a_b_.csv @lines:2-1 }} tail\n'), '<p>_a {{ a_b_.csv @lines:2-1 }} tail</p>')
  assert.equal(html('_a {{ ab_.csv @code }} tail\n'),
    '<p><u>a {{ ab</u>.csv <span class="mention"><strong>@code</strong></span> }} tail</p>')
  // A directive nothing closes into stays verbatim.
  assert.equal(html('x {{ a_b_.csv @code }} y\n'), '<p>x {{ a_b_.csv @code }} y</p>')
  assert.equal(html('_a {{ a_b.csv @code }} c_\n'), '<p><u>a {{ a_b.csv @code }} c</u></p>')
})
