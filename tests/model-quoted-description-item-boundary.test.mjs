import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source))

test('an open description in a quote ends its item at the marker column (carve#5346)', () => {
  const ended = '<dd>d</dd>'
  for (const source of [
    '- > +\n  :: t\n  : d\n: d\n',
    '- a\n  > +\n  :: t\n  : d\n: d\n',
    '1. a\n   > +\n   :: t\n   : d\n: d\n',
  ]) {
    const output = html(source)
    assert.ok(output.includes(ended), output)
    assert.ok(output.endsWith('</ol>\n<p>: d</p>') || output.endsWith('</ul>\n<p>: d</p>'), output)
  }
})

test('a term with no open description leaves the quote paragraph lazy (carve#5346)', () => {
  assert.match(html('- a\n  :: t\n  > prose\n: z\n'), /<blockquote><p>prose\n: z<\/p><\/blockquote>/)
})
