import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

const render = source => renderDoc(parse(source))

// carve#4162: a line below a descendant's marker-line fence ends that fence
// and opens a paragraph, which the next lazy line folds into (CARVE-P0-024 S4).
test('one line after a third-level fence takes the lazy line', () => {
  const html = render('- - - ~~~\n    x\ntail\n')
  assert.match(html, /<\/ul>\n {8}x\ntail\n {6}<\/li>/)
  assert.doesNotMatch(html, /<p>tail<\/p>/)
})

test('the two-line and second-level spellings answer the same', () => {
  assert.match(render('- - - ~~~\n    x\n    y\ntail\n'), /x\ny\ntail\n/)
  assert.match(render('- - ~~~\n  x\ntail\n'), /x\ntail\n/)
})

for (const fence of ['```', '````', '~~~']) {
  test(`deeper chains fold too (${fence})`, () => {
    assert.match(render(`- - - - ${fence}\n      x\ntail\n`), /x\ntail\n/)
    assert.match(render(`1. 1. 1. ${fence}\n      x\ntail\n`), /x\ntail\n/)
  })
}

test('the trace and the HTML agree on the folded line', () => {
  const records = modelTrace('- - - ~~~\n    x\ntail\n')
  assert.equal(records[2].form, 'lazy')
  assert.equal(records[2].owner, 'doc/item:1/item:1')
})

// Controls: a line inside the fence, or a blank, leaves nothing to fold into.
test('a line in the fence body or a blank before tail ends the list', () => {
  assert.match(render('- - - ~~~\n      x\ntail\n'), /<pre><code>x\n<\/code><\/pre>[\s\S]*<p>tail<\/p>$/)
  assert.match(render('- - - ~~~\n    x\n\ntail\n'), /<p>tail<\/p>$/)
})
