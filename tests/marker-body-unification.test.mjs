import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = source => renderDoc(parse(source))

test('all marker bodies retain below-column lazy text while a paragraph is open', () => {
  const list = html('- a\nlazy\n')
  const description = html(':: term\n: a\nlazy\n')
  const footnote = html('see[^n]\n\n[^n]: a\nlazy\n')
  assert.match(list, /<li>a\nlazy<\/li>/)
  assert.match(description, /<dd>a\nlazy<\/dd>/)
  assert.match(footnote, /<p>a\nlazy<a href="#fnref1"/)
})

test('a blank or interrupting opener ends a footnote lazy paragraph', () => {
  const blank = html('see[^n]\n\n[^n]: a\n\nout\n')
  const heading = html('see[^n]\n\n[^n]: a\n# heading\n')
  assert.match(blank, /<p>out<\/p>/)
  assert.doesNotMatch(blank, /<p>a\nout/)
  assert.match(heading, /<h1>heading<\/h1>/)
  assert.doesNotMatch(heading, /<p>a\n# heading/)
})

test('the exact colon closer releases every named fence body', () => {
  for (const opener of ['::: box', '::: note', '::: |', '::: figure', '::: footnotes']) {
    const output = html(`${opener}\ninside\n:::\nafter\n`)
    assert.match(output, /<p>after<\/p>$/, opener)
  }
})
