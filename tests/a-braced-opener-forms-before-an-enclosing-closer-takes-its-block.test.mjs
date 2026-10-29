import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src + '\n')).trim()
const BRACED = {
  '/': 'em', '*': 'strong', '_': 'u', '~': 's', '^': 'sup', ',': 'sub', '=': 'mark',
  '+': 'ins', '-': 'del', '#': 'span class="critic-comment"',
}
const close = (tag) => `</${tag.split(' ')[0]}>`

// The braced opener forms first, so the bare closer inside it closes nothing and
// the braced closer in its block ends the span (PART 9 E2a, carve#3940).
for (const o of ['/', '*', '_', '~', '=']) {
  for (const [b, tag] of Object.entries(BRACED)) {
    const src = `${o}{${b}a${o}{k=c${b}}`
    test(`braced opener forms first: ${src}`, () => {
      assert.equal(html(src), `<p>${o}<${tag}>a${o}{k=c${close(tag)}</p>`)
    })
  }
}

test('a block on a delimiter that closes nothing leaves a braced opener at its brace', () => {
  assert.equal(html('={_a=b_}'), '<p>=<u>a=b</u></p>')
  assert.equal(html('={_a=b_}='), '<p><mark><u>a=b</u></mark></p>')
  assert.equal(html('={_a={c} b_}'), '<p>=<u>a={c} b</u></p>')
})

test('a block on a closer that closes still attaches', () => {
  assert.equal(html('*a*{_k=b_}'), '<p><strong _k="b_">a</strong></p>')
  assert.equal(html('x{_a *b*{c_} y'), '<p>x{_a <strong c_="">b</strong> y</p>')
})
