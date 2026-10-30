import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

for (const host of ['- ', '1. ', '- [ ] ', '- - ']) for (const quote of ['> ', '> > ']) {
  test(`${JSON.stringify(host + quote)} term takes a column-zero caret line`, () => {
    const html = render(`${host}${quote}:: t\n^ cap\n`)
    assert.match(html, /<dt>t\n\^ cap<\/dt>/)
    assert.doesNotMatch(html, /<figcaption>|<p>\^ cap/)
  })
}

test('an outer quote folds an indented caret line into a nested term', () => {
  assert.match(render('> > :: t\n ^ cap\n'), /<dt>t\n\^ cap<\/dt>/)
})

test('a multi-line caret run folds the same way', () => {
  assert.match(render('- > :: t\n^ cap\nmore\n'), /<dt>t\n\^ cap\nmore<\/dt>/)
})

test('a top-level quote still takes the caret line as its caption', () => {
  assert.match(render('> :: t\n^ cap\n'), /<figcaption>cap<\/figcaption>/)
  assert.match(render('- > :: t\n  ^ cap\n'), /<figcaption>cap<\/figcaption>/)
})
