import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// After the first blank ends a description's attached fence, the paragraph the body
// resumes with takes lazy lines as an item's does (PART 0 S4, carve#5408).
const norm = (html) => html.replace(/\s+/g, ' ').replace(/> </g, '><')
const host = (html, open, close) => norm(html).replace(open, '<H>').replace(close, '</H>')
const item = (rest) => host(renderDoc(parse(`- +\n${rest}`)), /^<ul><li>/, /<\/li><\/ul>/)
const description = (rest) => host(renderDoc(parse(`:: t\n: +\n${rest}`)), /^<dl><dt>t<\/dt><dd>/, /<\/dd><\/dl>/)

test('the reproduction keeps end in the description paragraph', () => {
  assert.equal(renderDoc(parse(':: t\n: +\n```\n\n  tail\nend\n')), [
    '<dl>',
    '  <dt>t</dt>',
    '  <dd>',
    '    <pre><code></code></pre>',
    '    <p>tail',
    'end</p>',
    '  </dd>',
    '</dl>',
  ].join('\n'))
})

for (const opener of ['```', '~~~', '``` js', '````']) {
  for (const body of ['  tail', '  tail\n  more', '  tail\n\n  two']) {
    for (const last of ['end', ' end', 'end\nmore']) {
      const rest = `${opener}\n\n${body}\n${last}\n`
      test(`a description folds ${JSON.stringify(last)} after ${opener}, a blank and ${JSON.stringify(body)}`, () => {
        assert.equal(description(rest), item(rest))
      })
    }
  }
}

test('a closed fence still ends the body before a column-zero line', () => {
  assert.match(renderDoc(parse(':: t\n: +\n```\nx\n```\nend\n')), /<\/dl>\n<p>end<\/p>/)
})
