import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4861: a term is a one-line leaf like a heading, so with no `: ` line
// after it a document reads the same with `# t` in the term's place.
const render = (source) => renderDoc(parse(source))
const leaf = (html, pattern) => html.replace(/<section[^>]*>|<\/section>/g, '').replace(pattern, 'LEAF').replace(/\s+/g, '')
const asTerm = (html) => leaf(html, /<dl>\s*<dt>t<\/dt>\s*<\/dl>/g)
const asHeading = (html) => leaf(html, /<h1[^>]*>t<\/h1>/g)

const hosts = [['', ''], ['- ', '  '], ['1. ', '   '], ['> ', '> '], ['> - ', '>   '], ['- > ', '  > '], ['[^n]: ', '     '],
  [':: o\n: ', '  '], ['- x\n  ', '  '], ['  ', '  '], ['::: d\n', '']]
const followers = ['plain', 'wrapped *x*', '- x', '1. x', '> q', '# h', '---', '| a |', '```\nc\n```', '::: b\n:::', '^ cap', '+', '%% c\nplain',
  '{.a}\nplain', '[r]: /u', ':', '::', '\\: x', '  plain\nmore', '\nplain', '\tplain']
const prefixes = (continuation) => [continuation, '', ' ', continuation.replace(/>/g, ''), continuation + '  ']

let count = 0
for (const [lead, continuation] of hosts) for (const follower of followers) for (const prefix of prefixes(continuation)) for (const tail of ['', '\nend']) {
  count++
  const body = follower.split('\n').map((line) => prefix + line).join('\n') + tail + '\n'
  test(`${JSON.stringify(lead + ':: t\n' + body)} reads like a heading`, () => {
    assert.equal(asTerm(render(`${lead}:: t\n${body}`)), asHeading(render(`${lead}# t\n${body}`)))
  })
}
test('the sweep is the size the PR states', () => assert.equal(count, 2310))

test('the ticket rows', () => {
  assert.equal(render(':: A term that\nwraps\n: def\n'), '<dl>\n  <dt>A term that</dt>\n</dl>\n<p>wraps\n: def</p>')
  assert.equal(render('- one\n  :: term\nwrapped\n'),
    '<ul>\n  <li>one\n    <dl>\n      <dt>term</dt>\n    </dl>\n  </li>\n</ul>\n<p>wrapped</p>')
  assert.equal(render(':: t\n  - x\n: d\n'), '<dl>\n  <dt>t</dt>\n</dl>\n<ul>\n  <li>x\n: d</li>\n</ul>')
})

test('a description follows past the blank run and invisible lines, at any column', () => {
  const pair = '<dl>\n  <dt>t</dt>\n  <dd>d</dd>\n</dl>'
  for (const between of ['', '\n', '\n\n', '%% c\n', '  %% c\n', '[r]: /u\n', '  [r]: /u\n', '%% c\n\n']) {
    for (const separator of [': d', ' : d', '  : d', ':  d']) {
      assert.equal(render(`:: t\n${between}${separator}\n`), pair, JSON.stringify(between + separator))
    }
  }
  for (const between of ['%%%\nc\n%%%\n', '  %%%\n  c\n  %%%\n']) {
    assert.equal(render(`:: t\n${between}: d\n`), pair, JSON.stringify(between))
  }
})

test('a contentless separator is a plain line in every spelling', () => {
  for (const marker of [':', ': ', ':   ', ':\t', ': \t']) {
    assert.equal(render(`:: t\n${marker}\n`), '<dl>\n  <dt>t</dt>\n</dl>\n<p>:</p>')
  }
})

test('a comment after a term splits nothing', () => {
  assert.doesNotMatch(render(':: t\n  %% c\nu\n'), /<dt>t\n/)
  assert.ok(!Object.hasOwn(parse(':: t\n  %% c\n: d\n').blocks[0].items[0], 'runs'))
})
