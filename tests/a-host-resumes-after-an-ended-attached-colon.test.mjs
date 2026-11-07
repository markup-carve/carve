import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// After the blank that ends an unclosed attached colon, the host item resumes
// as after an unclosed attached fence (carve#5359): its content column keeps any block.
const block = (opener) => opener.startsWith(':') ? `${opener} note` : opener
const strip = (html) => html.replace(/<aside[^>]*>\s*<\/aside>|<pre><code><\/code><\/pre>/g, 'B')

for (const next of ['tail', '- q', '> q', '# h', '| a |', ': d']) {
  test(`a top-level host keeps ${next} after its ended attached colon`, () => {
    const render = (opener) => strip(renderDoc(parse(`- +\n${block(opener)}\n\n  ${next}\n`)))
    assert.equal(render(':::'), render('```'))
  })
  test(`a nested host keeps ${next} after its ended attached colon`, () => {
    const render = (opener) => strip(renderDoc(parse(`- a\n  * +\n  ${block(opener)}\n\n    ${next}\n`)))
    assert.equal(render(':::'), render('```'))
  })
}

test('the trace gives the resumed host the blank and the block after it', () => {
  const owners = modelTrace('- a\n  * +\n  ::: note\n\n    - q\n').map((r) => [r.line, r.owner])
  assert.deepEqual(owners.slice(3), [[4, 'doc/item:1/item:2'], [5, 'doc/item:1/item:2/item:5']])
})

test('a marker that ends a nested attached colon lets a later blank loosen the outer item', () => {
  for (const next of ['tail', '1. y']) {
    const html = renderDoc(parse(`- a\n  * +\n  ::: note\n  - x\n\n  ${next}\n`))
    assert.match(html, /<li><p>a<\/p>/, next)
  }
})
