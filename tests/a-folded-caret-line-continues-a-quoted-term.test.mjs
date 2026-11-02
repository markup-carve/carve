import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

for (const host of ['- ', '1. ', '- [ ] ', '- - ']) for (const quote of ['> ', '> > ']) {
  test(`${JSON.stringify(host + quote)} term ends at a column-zero caret line`, () => {
    const html = render(`${host}${quote}:: t\n^ cap\n`)
    assert.match(html, /<dt>t<\/dt>/)
    assert.match(html, /<p>\^ cap<\/p>/)
  })
}

test('an indented caret line is read outside a nested term', () => {
  assert.match(render('> > :: t\n ^ cap\n'), /<dt>t<\/dt>/)
})

test('a multi-line caret run is one paragraph after the term', () => {
  assert.match(render('- > :: t\n^ cap\nmore\n'), /<p>\^ cap\nmore<\/p>/)
})

test('a top-level quote still takes the caret line as its caption', () => {
  assert.match(render('> :: t\n^ cap\n'), /<figcaption>cap<\/figcaption>/)
  assert.match(render('- > :: t\n  ^ cap\n'), /<figcaption>cap<\/figcaption>/)
})
