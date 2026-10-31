import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4633: a caption-shaped or marker line folded below a description's
// column probed the whole body again on every line.
const shapes = [
  ['     [r]: /u\n   :: t\n   : d\n', '   ^ cap\n'],
  [':: t\n:   d\n', '  ^ cap\n'],
  ['- :: t\n  :   d\n', '    ^ cap\n'],
  [':: t\n:   d\n', '  * y\n'],
  [':: t\n:   d\n', '  1. z\n'],
  [':: t\n:   d\n', '  ^ cap\n  plain\n'],
  ['[^n]: :: t\n  :   d\n', '    ^ cap\n'],
]
const probed = (head, unit, count) => {
  resetLayoutWork()
  parse(head + unit.repeat(count))
  return layoutWork.paragraphProbe
}

for (const [head, unit] of shapes) {
  test(`${JSON.stringify(head + unit)} probes a linear number of body lines`, () => {
    const small = probed(head, unit, 500)
    const large = probed(head, unit, 2000)
    assert.ok(large <= small * 4 * 1.25, `500 units: ${small} lines, 2000 units: ${large}`)
  })
}

test('32,000 folded caption lines parse within a generous bound', () => {
  const started = performance.now()
  parse('     [r]: /u\n   :: t\n   : d\n' + '   ^ cap\n'.repeat(32000))
  assert.ok(performance.now() - started < 10000)
})

test('the folded caption lines stay paragraph text in the description', () => {
  assert.equal(renderDoc(parse(':: t\n:   d\n  ^ a\n  ^ b\n')), '<dl>\n  <dt>t</dt>\n  <dd>d\n^ a\n^ b</dd>\n</dl>')
})
