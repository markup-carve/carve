/*
 * `bold_italic` is a span like any other, so PART 9 §9 resolves its content.
 * The executable reference rendered `biInner`'s children and joined them, so
 * nothing inside the combined token paired and PART 9 §7's marker boundary
 * never reached it.
 *
 * The token owns BOTH `/` and `*`, which is why the repair is a set of literal
 * delimiters rather than the single one a forced span needs: §9 E3 holds both
 * of its own BARE delimiters literal inside it, while the other three resolve
 * normally. E3 is NO BARE SAME-TYPE NESTING, so a BRACED child of either of
 * the token's two kinds nests inside it (carve#2903).
 *
 * `scripts/formal-core-check.mjs` cannot see it: no corpus document writes a
 * bare span or a marker inside a combined token, so all 1740 inputs stayed
 * conformant either way. Hence a test rather than corpus cases.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const bi = (inner) => `<p><strong><em>${inner}</em></strong> x</p>`

test('the other three delimiters pair inside the combined token', () => {
  assert.equal(html('/*a ~s~ b*/ x\n'), bi('a <s>s</s> b'))
  assert.equal(html('/*a =h= b*/ x\n'), bi('a <mark>h</mark> b'))
  assert.equal(html('/*a _b_ c*/ x\n'), bi('a <u>b</u> c'))
  assert.equal(html('/*a ~s~ _u_ =h= b*/ x\n'), bi('a <s>s</s> <u>u</u> <mark>h</mark> b'))
  // E3 reaches inside too: the second run of an open kind stays literal.
  assert.equal(html('/*a ~b~ ~c~ d*/ x\n'), bi('a <s>b</s> <s>c</s> d'))
  // An opener with no closer inside stays literal (E5).
  assert.equal(html('/*a ~b c*/ x\n'), bi('a ~b c'))
})

test("the combined token's own two delimiters stay literal inside it", () => {
  assert.equal(html('/*a *b* c*/ x\n'), bi('a *b* c'))
  assert.equal(html('/*a /b/ c*/ x\n'), bi('a /b/ c'))
  assert.equal(html('/*/x/*/ y\n'), '<p><strong><em>/x/</em></strong> y</p>')
  // E3 restricts BARE openers only, so a braced child of either activated
  // kind nests here the same as anywhere else (carve#2903).
  assert.equal(html('/*a {*b*} c*/ x\n'), bi('a <strong>b</strong> c'))
  assert.equal(html('/*a {/b/} c*/ x\n'), bi('a <em>b</em> c'))
  // The reverse was always allowed and does not move: a combined token is an
  // ordinary child of a braced span of either of its kinds. It is a test and
  // not a corpus row because the pinned writer cannot spell the tree yet.
  assert.equal(html('{*a /*b*/ c*}\n'), '<p><strong>a <strong><em>b</em></strong> c</strong></p>')
  // A forced span of another delimiter is unaffected.
  assert.equal(html('/*a {_b_} c*/ x\n'), bi('a <u>b</u> c'))
})

test("PART 9 §7's marker boundary reaches inside the combined token", () => {
  assert.equal(html('/*a_#t*/ x\n'), bi('a_#t'))
  assert.equal(html('/*a_@b*/ x\n'), bi('a_@b'))
  // The control: the same markers after a space open their construct.
  assert.equal(html('/*a #t b*/ x\n'), bi('a <span class="tag"><strong>#t</strong></span> b'))
  assert.equal(
    html('/*a @b c*/ x\n'),
    bi('a <span class="mention"><strong>@b</strong></span> c'),
  )
})

test('a forced span outside a combined token still resolves', () => {
  assert.equal(html('a {*b*} c\n'), '<p>a <strong>b</strong> c</p>')
  assert.equal(html('{*a *b* c*} x\n'), '<p><strong>a *b* c</strong> x</p>')
  assert.equal(html('{_a {*b*} c_} x\n'), '<p><u>a <strong>b</strong> c</u> x</p>')
  assert.equal(
    html('{*a {/b {*c*} d/} e*} x\n'),
    '<p><strong>a <em>b <strong>c</strong> d</em> e</strong> x</p>',
  )
})
