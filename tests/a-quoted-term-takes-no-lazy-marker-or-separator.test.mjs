import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const compact = html => html.replace(/>\s+</g, '><').trim()
const render = source => compact(renderDoc(parse(source)))
const quoteHeads = ['> :: t', '> > :: t', '> > > :: t']
const itemHeads = ['> - :: t', '> > - :: t', '> 1. :: t', '> - [ ] :: t', '> - - :: t']

for (const head of [...quoteHeads, ...itemHeads]) {
  const quoted = render(head + '\n')
  for (const pad of ['', ' ', '  ', '   ', '    ']) test(`${head} still takes plain text at column ${pad.length}`, () => {
    assert.match(render(`${head}\n${pad}tail\n`), /<dt>t\ntail<\/dt>/)
  })
  for (const pad of ['', ' ', '  ']) test(`${head} ends at a ${pad.length}-column list marker`, () => {
    assert.equal(render(`${head}\n${pad}- x\n`), `${quoted}<ul><li>x</li></ul>`)
  })
}
for (const head of quoteHeads) {
  const quoted = render(head + '\n')
  for (const pad of ['', ' ', '  ', '   ', '    ']) test(`${head} ends at a ${pad.length}-column separator`, () => {
    assert.equal(render(`${head}\n${pad}: d\n`), `${quoted}<p>: d</p>`)
  })
}
test('a term in a quoted item keeps an indented separator', () => {
  assert.equal(render('> - :: t\n : d\n'), '<blockquote><ul><li><dl><dt>t\n: d</dt></dl></li></ul></blockquote>')
})

test('a prefixed separator still opens the description', () => {
  assert.equal(render('> :: t\n> : d\n'), '<blockquote><dl><dt>t</dt><dd>d</dd></dl></blockquote>')
})
test('a separator after an open description folds as that paragraph\'s lazy text', () => {
  assert.equal(render('> :: t\n> : a\n : d\n'), '<blockquote><dl><dt>t</dt><dd>a\n: d</dd></dl></blockquote>')
})
test('a separator after a lazy term line still ends the quote', () => {
  assert.equal(render('> :: t\ntail\n : d\n'), '<blockquote><dl><dt>t\ntail</dt></dl></blockquote><p>: d</p>')
})
