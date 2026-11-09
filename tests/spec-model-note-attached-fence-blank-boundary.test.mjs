import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('a blank in a note-attached descendant fence does not open a lazy note paragraph, carve#5581', () => {
  for (const payload of ['- nest', '1. nest', '> quote', 'plain']) {
    const source = `x[^a]\n\n[^a]: +\n- \`\`\`\n  ${payload}\n\ny\n`
    const output = html(source)
    assert.match(output, /^<p>x<a /, payload)
    assert.match(output, /<\/p>\n<p>y<\/p>\n<section role="doc-endnotes"/, payload)
    assert.ok(output.includes(`<pre><code>${payload.replace('>', '&gt;')}\n\n</code>`), payload)
  }
  assert.equal(html('[^a]: +\n- ```\n  - nest\n\nx\n'), '<p>x</p>')
})
