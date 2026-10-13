import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const first of [true, false]) for (const wrapped of [false, true]) {
  test(`block attributes end term ownership: first term ${first}, wrapped ${wrapped}`, () => {
    const lead = first ? '- :: term\n' : '- lead\n\n  :: a\n  : d\n  :: b\n'
    const attributes = first ? (wrapped ? '  {.a\n  .b}\n' : '  {.a}\n') : (wrapped ? '  {.x\n  .y}\n' : '  {.x}\n')
    const terms = first ? '<dl><dt>term</dt></dl>' : 'lead<dl><dt>a</dt><dd>d</dd><dt>b</dt></dl>'
    const classes = first ? (wrapped ? 'a b' : 'a') : (wrapped ? 'x y' : 'x')
    assert.equal(renderDoc(parse(lead + attributes + '     # heading\n')).replace(/\n\s*/g, ''), `<ul><li>${terms}<h1 class="${classes}" id="heading">heading</h1></li></ul>`)
  })
}
