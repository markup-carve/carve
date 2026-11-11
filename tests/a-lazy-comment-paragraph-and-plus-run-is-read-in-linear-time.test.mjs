// Repeated lazy `{% a %}` and `+` lines after a host stop each comment-only probe at the first visible line (carve#5658).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('lazy comment and plus lines leave an item with its text', () => {
  assert.equal(html('- x\n{% a %}\n+\n{% a %}\n+\n'), '<ul>\n  <li>x\n</li>\n</ul>')
})

const views = (src) => {
  resetLayoutWork()
  parse(src)
  return layoutWork.views
}

for (const [name, shape] of [
  ['an item', (n) => '- x\n' + '{% a %}\n+\n'.repeat(n)],
  ['an item with a colon fence after it', (n) => '- x\n' + '{% a %}\n+\n'.repeat(n) + '\n::: d\nz\n:::\n'],
  ['a note', (n) => '[^n]: x\n' + '{% a %}\n+\n'.repeat(n) + '\nx[^n]\n'],
  ['a description', (n) => ':: t\n: x\n' + '{% a %}\n+\n'.repeat(n)],
  ['an item in a quote', (n) => '> - x\n' + '> {% a %}\n> +\n'.repeat(n)],
]) {
  test(`lazy comment and plus lines after ${name} are measured in linear work`, () => {
    const small = views(shape(100))
    const large = views(shape(800))
    assert.ok(large < small * 12, `100 repeats: ${small} views, 800: ${large}`)
  })
}
