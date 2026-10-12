import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const compact = html => html.replace(/>\s+</g, '><').trim()
const render = source => compact(renderDoc(parse(source)))
const shapes = [
  ['> :: t', '<blockquote><dl><dt>t\ntail</dt></dl></blockquote>'],
  ['> - :: t', '<blockquote><ul><li><dl><dt>t\ntail</dt></dl></li></ul></blockquote>'],
  ['- > :: term', '<ul><li><blockquote><dl><dt>term\ntail</dt></dl></blockquote></li></ul>'],
  ['- :: t', '<ul><li><dl><dt>t\ntail</dt></dl></li></ul>'],
  ['> > :: t', '<blockquote><blockquote><dl><dt>t\ntail</dt></dl></blockquote></blockquote>'],
  ['> > - :: t', '<blockquote><blockquote><ul><li><dl><dt>t\ntail</dt></dl></li></ul></blockquote></blockquote>'],
]
for (const [head, expected] of shapes) {
  for (const pad of ['', ' ']) test(`${head} takes a ${pad ? 'below-column' : 'flush-left'} plain line`, () => {
    assert.equal(render(head + '\n' + pad + 'tail\n'), expected)
  })
}
test('a prefixed plain line continues the quoted term', () => {
  assert.equal(render('> :: t\n> tail\n'), shapes[0][1])
})
test('a description marker outside the quote stays in the list item', () => {
  assert.equal(render('- > :: term\n: body\n'), '<ul><li><blockquote><dl><dt>term</dt></dl></blockquote>\n    : body\n  </li></ul>')
})
for (const [head] of shapes.filter(([head]) => head.includes('>'))) {
  for (const block of ['# h\n', '---\n', '- x\n', '```\nx\n```\n']) {
    test(`${head} releases an unprefixed ${JSON.stringify(block)} block`, () => {
      if (head === '- > :: term' && block === '- x\n') {
        assert.equal(render(head + '\n' + block), '<ul><li><blockquote><dl><dt>term</dt></dl></blockquote></li><li>x</li></ul>')
        return
      }
      const prefix = head + '\n'
      const doc = parse(prefix)
      assert.equal(render(prefix + block), compact(renderDoc({ ...doc, blocks: [...doc.blocks, ...parse(block).blocks] })))
    })
  }
}

for (const head of ['> :: t', '> - :: t', '> > :: t', '> > - :: t']) {
  test(`${head} opens a prefixed inner quote after the term`, () => {
    const prefix = head.startsWith('>>') || head.startsWith('> >') ? '> > ' : '> '
    assert.doesNotMatch(render(head + '\n' + prefix + '> x\n'), /<dt>[^<]*x/)
  })
}
test('an unprefixed quote leaves the quoted term in a list item', () => {
  assert.equal(render('- > :: term\n> x\n'), '<ul><li><blockquote><dl><dt>term</dt></dl></blockquote></li></ul><blockquote><p>x</p></blockquote>')
})
