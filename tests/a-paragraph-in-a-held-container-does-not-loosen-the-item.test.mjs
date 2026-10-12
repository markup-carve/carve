import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const description = '<dl><dt>term</dt><dd><p>body</p><p>text</p></dd></dl>'
const html = source => renderDoc(parse(source)).replace(/\s*(<[^>]+>)\s*/g, '$1')
const intro = '- intro\n  :: term\n  : body\n\n    text\n'
const term = '- :: term\n  : body\n\n    text\n'

for (const [name, source, expected] of [
  ['intro-led item', intro, `<ul><li>intro${description}</li></ul>`],
  ['term-led item', term, `<ul><li>${description}</li></ul>`],
  ['quoted list', intro.split('\n').slice(0, -1).map(line => `> ${line}`.trimEnd()).join('\n') + '\n', `<blockquote><ul><li>intro${description}</li></ul></blockquote>`],
  ['description in a sublist', '- outer\n' + intro.split('\n').slice(0, -1).map(line => line ? `  ${line}` : '').join('\n') + '\n', `<ul><li>outer<ul><li>intro${description}</li></ul></li></ul>`],
]) {
  test(`a second description paragraph keeps the ${name} tight`, () => {
    assert.equal(html(source), expected)
    const blocks = parse(source).blocks
    const list = blocks[0].t === 'quote' ? blocks[0].children[0] : blocks[0]
    assert.equal(list.tight, true)
    if (name === 'description in a sublist') assert.equal(list.items[0].blocks[1].tight, true)
  })
}

test('a second footnote body paragraph keeps its item tight', () => {
  const source = '- intro\n  [^f]: body\n\n    text\n\nsee[^f]\n'
  assert.equal(parse(source).blocks[0].tight, true)
  assert.match(html(source), /^<ul><li>intro<\/li><\/ul>/)
  assert.match(html(source), /<p>body<\/p><p>text<a /)
})

test('a second paragraph of the item still loosens it', () => {
  const source = '- intro\n  :: term\n  : body\n\n  text\n'
  assert.equal(parse(source).blocks[0].tight, false)
  assert.equal(html(source), '<ul><li><p>intro</p><dl><dt>term</dt><dd>body</dd></dl><p>text</p></li></ul>')
})

test('a blank before the next sibling marker still loosens the list', () => {
  const source = intro + '\n- sibling\n'
  assert.equal(parse(source).blocks[0].tight, false)
  assert.equal(html(source), `<ul><li><p>intro</p>${description}</li><li><p>sibling</p></li></ul>`)
})
