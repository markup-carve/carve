import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

for (const marker of ['- ', '1. ', '* [ ] ']) for (const depth of [1, 2, 3]) {
  const lead = Array.from({ length: depth - 1 }, (_, i) => `${'  '.repeat(i)}- level\n`).join('')
  const base = '  '.repeat(depth - 1)
  test(`nested description releases ${JSON.stringify(marker)} at depth ${depth}`, () => {
    const html = render(`${lead}${base}:: outer\n${base}:  detail\n${base}   :: inner\n${base}   :  body\n${base}     ${marker}child\n`)
    assert.match(html, /<dd>body<\/dd>[\s\S]*<\/(?:dl)>[\s\S]*<(?:ul|ol)(?:\s[^>]*)?>/)
    assert.doesNotMatch(html, /<dd>body[^<]*child/)
  })
}

test('a nested description keeps the at-body-column marker in its paragraph', () => {
  assert.match(render(':: outer\n:  detail\n   :: inner\n   :  body\n       - child\n'), /<dd>body\n- child<\/dd>/)
})

test('a marker exactly at the outer description body column opens there', () => {
  assert.match(render(':: outer\n:  detail\n   :: inner\n   :  body\n   - child\n'), /<dd>body<\/dd>[\s\S]*<\/dl>[\s\S]*<ul>/)
})

test('document and direct quote controls keep below-column markers as text', () => {
  assert.match(render(':: term\n:  body\n  - child\n'), /<dd>body\n- child<\/dd>/)
  assert.match(render('> :: term\n> :  body\n>   - child\n'), /<dd>body\n- child<\/dd>/)
})

test('a nested quote releases the marker to its surviving description', () => {
  const html = render('> :: outer\n> :  detail\n>    :: inner\n>    :  body\n>      - child\n')
  assert.match(html, /<dd>body<\/dd>[\s\S]*<\/dl>[\s\S]*<ul>/)
})
