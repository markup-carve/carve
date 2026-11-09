import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('an exact colon run short of an authored base stays in the colon body', () => {
  const source = '- head\n\n      :::\n      a\n    :::\n\n  tail\n'
  assert.equal(html(source), '<ul>\n  <li><p>head</p>\n    <div>\n      <p>a\n:::</p>\n      <p>tail</p>\n    </div>\n  </li>\n</ul>')

  const trace = []
  parse(source, { trace })
  assert.equal(trace.find(row => row.line === 5)?.form, 'text')
  assert.equal(trace.find(row => row.line === 7)?.owner, 'doc/item:1/div:3')
})

test('only a run at the authored base closes an item colon body', () => {
  for (const offset of [-2, -1, 1, 2]) {
    const source = `- head\n\n      :::\n      a\n${' '.repeat(6 + offset)}:::\n\n  tail\n`
    const output = html(source)
    assert.match(output, /<p>a\n:::<\/p>\n\s*<p>tail<\/p>\n\s*<\/div>/)
  }
  assert.match(html('- head\n\n      :::\n      a\n      :::\n\n  tail\n'), /<\/div>\n\s*<p>tail<\/p>/)
})

test('the authored base rule also applies inside a description', () => {
  const source = ':: t\n: head\n\n      :::\n      a\n    :::\n\n  tail\n'
  assert.match(html(source), /<p>a\n:::<\/p>\n\s*<p>tail<\/p>\n\s*<\/div>/)
})
