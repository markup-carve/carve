import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a tab crossing an item prefix leaves no verse lead before its opener', () => {
  const tabbed = '- a\n  \t::: |\n\tz\n  \t:::\n'
  const spaced = '- a\n      ::: |\n    z\n      :::\n'
  const expected = '<p>z</p>'
  const tabbedHtml = renderDoc(parse(tabbed))
  assert.equal(tabbedHtml, renderDoc(parse(spaced)))
  assert.ok(tabbedHtml.includes(expected))
})
