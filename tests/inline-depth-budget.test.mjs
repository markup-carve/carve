// PART 9 §22 DEPTH LIMIT and §25 RESOURCE BOUNDS, on the spec model (carve#4474).
// Too large for a corpus page, as tests/nesting-cap-degrade.test.mjs explains.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src)).trim()
const nest = (open, close, n, x = 'x') => open.repeat(n) + x + close.repeat(n)
const count = (html, tag) => (html.match(new RegExp(`<${tag}>`, 'g')) ?? []).length

test('199 braced spans nest, and the 200th keeps its whole spelling literal', () => {
  const html = render(nest('{*', '*}', 201))
  assert.equal(count(html, 'strong'), 199)
  assert.ok(html.includes('<strong>{*{*x*}*}</strong>'), html.slice(3000))
})

for (const [open, close, tag] of [['{*', '*}', 'strong'], ['{_', '_}', 'u'], ['{/', '/}', 'em'], ['{=', '=}', 'mark'], ['{^', '^}', 'sup']]) {
  test(`far past the cap ${open} renders instead of overflowing the stack`, () => {
    assert.equal(count(render(nest(open, close, 5000)), tag), 199)
  })
}

test('markup inside the literal range makes no nodes', () => {
  const html = render(nest('{*', '*}', 201, '`c` /y/'))
  assert.ok(html.includes('{*{*`c` /y/*}*}'), html.slice(3000))
  assert.ok(!html.includes('<code>'))
})

test('hiding text does not take a span out of the budget', () => {
  assert.equal(count(render(nest('{*', '*}', 500, '`c` <http://a.b> \\_')), 'strong'), 199)
})

test('bare and braced spans share one budget', () => {
  const html = render(nest('{*/', '/*}', 250))
  assert.equal(count(html, 'strong') + count(html, 'em'), 199)
})

test('an editorial span counts toward the budget and its closer stays its own', () => {
  const html = render(nest('{+{*', '*}+}', 250))
  assert.equal(count(html, 'strong') + count(html, 'ins'), 199)
  assert.ok(html.endsWith('</ins></p>') || html.endsWith('</strong></p>'))
})

test('a repeated editorial opener still ends at its first closer', () => {
  assert.equal(count(render(nest('{+', '+}', 500)), 'ins'), 1)
})

test('the budget holds inside a container', () => {
  assert.equal(count(render('> ' + nest('{*', '*}', 500)), 'strong'), 199)
})
