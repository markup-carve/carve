// A stretch of closerless `{%` openers is scanned once, whatever blocks separate them (carve#5879).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('closerless openers between blocks stay paragraph text', () => {
  assert.equal(html('{% a\n:: t\n{% a\n:: t\n'), '<p>{% a</p>\n<dl>\n  <dt>t</dt>\n</dl>\n<p>{% a</p>\n<dl>\n  <dt>t</dt>\n</dl>')
})

const work = (src) => {
  resetLayoutWork()
  parse(src)
  return Object.values(layoutWork).reduce((a, b) => a + b, 0)
}

for (const [name, shape] of [
  ['term lines', (n) => '{% a\n:: t\n'.repeat(n)],
  ['list items', (n) => '- a\n{% a\n'.repeat(n)],
  ['headings in an item', (n) => '- x\n' + '  {% a\n  # h\n'.repeat(n)],
  ['tables in a description', (n) => ':: t\n: d\n' + '  {% a\n  | a |\n'.repeat(n)],
  ['term lines in a quote', (n) => '> {% a\n> :: t\n'.repeat(n)],
  ['tabbed openers and headings', (n) => '\t{% a\n# h\n'.repeat(n)],
]) {
  test(`closerless openers between ${name} cost linear work`, () => {
    const small = work(shape(250))
    const large = work(shape(2000))
    assert.ok(large < small * 12, `250 openers: ${small}, 2,000: ${large}`)
  })
}
