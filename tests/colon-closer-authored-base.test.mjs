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

test('a run below the authored base stays in an item colon body', () => {
  for (const offset of [-2, -1]) {
    const source = `- head\n\n      :::\n      a\n${' '.repeat(6 + offset)}:::\n\n  tail\n`
    const output = html(source)
    assert.match(output, /<p>a\n:::<\/p>\n\s*<p>tail<\/p>\n\s*<\/div>/)
  }
  for (const offset of [0, 1, 2]) {
    const source = `- head\n\n      :::\n      a\n${' '.repeat(6 + offset)}:::\n\n  tail\n`
    assert.match(html(source), /<\/div>\n\s*<p>tail<\/p>/)
  }
})

test('the authored base rule also applies inside a description', () => {
  const source = ':: t\n: head\n\n      :::\n      a\n    :::\n\n  tail\n'
  assert.match(html(source), /<p>a\n:::<\/p>\n\s*<p>tail<\/p>\n\s*<\/div>/)
})

test('a below-base run in a figure caption renders no parser marker', () => {
  const output = html('  ::: figure\n![one](a.png)\n^ One\n :::\n')
  assert.match(output, /<figcaption>One\n:::<\/figcaption>/)
  assert.ok(!output.includes('\0'))
  assert.ok(!html('::: figure\n![one](a.png)\n^ One\n  :::\n').includes('\0'))
})

test('a below-base run inside a multiline code span keeps its source bytes', () => {
  const output = html('  :::\n`a\n :::\nb`\n')
  assert.match(output, /<code>a\n:::\nb<\/code>/)
  assert.ok(!output.includes('\\:::'))
  assert.ok(!output.includes('\0'))
})

test('a below-base run folded through a child paragraph cannot close the parent div', () => {
  const output = html('  :::\n  - a\n :::\n  tail\n')
  assert.equal(output, '<div>\n  <ul>\n    <li>a\n:::\ntail</li>\n  </ul>\n</div>')
  assert.ok(!output.includes('\0'))
})
