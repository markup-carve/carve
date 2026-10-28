import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const item = (note, follower) => `- body\n\n  [^n]: ${note}\n${follower}\n`

test('a hosted note heading does not create a second item paragraph', () => {
  const doc = parse('- see[^n]\n\n  [^n]: a\n    # h\n')
  assert.equal(doc.blocks[0].tight, true)
})

test('a footnote paragraph owns a below-column lazy line without loosening its host item', () => {
  const doc = parse(item('text', '   tail'))
  assert.equal(doc.blocks[0].tight, true)
  assert.equal(renderDoc(doc), '<ul>\n  <li>body</li>\n</ul>')
})

test('a closed footnote block leaves a below-column paragraph in the loose host item', () => {
  const doc = parse(item('# heading', '   tail'))
  assert.equal(doc.blocks[0].tight, false)
  assert.match(renderDoc(doc), /<li><p>body<\/p>\n    <p>tail<\/p>/)
})

test('a blank ends the footnote paragraph claim before a below-column follower', () => {
  const doc = parse(`- body\n\n  [^n]: text\n\n   tail\n`)
  assert.equal(doc.blocks[0].tight, false)
  assert.match(renderDoc(doc), /<li><p>body<\/p>\n    <p>tail<\/p>/)
})
