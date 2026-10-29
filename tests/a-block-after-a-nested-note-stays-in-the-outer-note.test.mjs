import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// Rule A (carve#3885): a note nested in a note's body ends at the outer body
// column, and the outer note keeps the next block whatever hosts it
// (carve#3927, #3931).
const html = (lines) => renderDoc(parse(lines.join('\n') + '\n')).replace(/\n[ \t]*(?=<)/g, '').trim()
const outerNote = (out) => /<li id="fn1">(.*?)<\/li><li id="fn2">/.exec(out)?.[1] ?? ''
const body = (out) => out.slice(0, out.indexOf('<section'))

const followers = {
  'a fence': [['~~~', '~~~'], '<pre><code></code></pre>'],
  'a quote': [['> q'], '<blockquote><p>q</p></blockquote>'],
  'a heading': [['# h'], '>h</h1>'],
  'a list after a blank': [['', '- sib'], '<ul><li>sib</li></ul>'],
  'an attribute line': [['{.c}', 'p'], '<p class="c">p'],
}
const hosts = {
  'a marker-line note': (m, rest) => [m + '[^a]: text', ...rest],
  'a note nested under an item': (m, rest) => [m + 'x', ' '.repeat(m.length) + '[^a]: text', ...rest],
}
for (const marker of ['- ', '1. ', '- [ ] ']) for (const [hostName, host] of Object.entries(hosts)) {
  for (const [name, [lines, expected]] of Object.entries(followers)) for (const blank of [false, true]) {
    test(`${name} after a nested note stays in ${hostName} (${marker.trim()}, blank ${blank})`, () => {
      const pad = ' '.repeat(marker.length + 2)
      const out = html([...host(marker, [pad + '[^b]: inner', ...(blank ? [''] : []), ...lines.map((l) => (l ? pad + l : ''))]), '', 'r[^a][^b]'])
      assert.ok(outerNote(out).includes(expected), out)
      assert.ok(!body(out).includes(expected), out)
    })
  }
}

test('a quoted marker-line note keeps a fence after its nested note', () => {
  const out = html(['> - [^a]: text', '>     [^b]: inner', '>     ~~~', '>     ~~~', '', 'r[^a][^b]'])
  assert.ok(outerNote(out).includes('<pre><code></code></pre>'), out)
})

const noteBodies = {
  'a list': ['[^b]: text', '', '  - c2'],
  'an ordered list': ['[^b]: text', '', '  1. c2'],
  'a nested list': ['[^b]: text', '', '  - c2', '    - c3'],
  'a nested note': ['[^b]: text', '  [^c]: inner'],
  'a nested note holding a list': ['[^b]: text', '  [^c]: inner', '', '    - c'],
}
const itemHosts = {
  'an item': [['- x'], '  ', []],
  'an ordered item': [['1. x'], '   ', []],
  'a nested item': [['- a', '  - x'], '    ', []],
  'an item in a colon fence': [['::: n', '- x'], '  ', [':::']],
}
for (const [hostName, [pre, pad, post]] of Object.entries(itemHosts)) for (const [bodyName, lines] of Object.entries(noteBodies)) {
  test(`a blank inside a note holding ${bodyName} keeps ${hostName} tight`, () => {
    const out = html([...pre, ...lines.map((l) => (l ? pad + l : '')), '', pad + '  after', ...post, '', 'r[^b][^c]'])
    assert.match(body(out), /<li>x<\/li>/, out)
    assert.match(out.slice(out.indexOf('<section')), /<p>after/, out)
  })
}

test('a lazy line in a task item\'s marker-line note leaves no frame marker', () => {
  const out = html(['- [ ] [^a]: text', '', '        - c', '      para', '', 'r[^a]'])
  assert.ok(!out.includes('\u0000'), JSON.stringify(out))
  assert.match(out, /<li>c\npara<\/li>/)
})

test('a task item\'s marker-line note reads a descendant fence like the plain item', () => {
  const task = html(['- [ ] [^a]: text', '', '        - c', '', '          ~~~', '            k', '          ~~~', '', 'r[^a]'])
  const plain = html(['- [^a]: text', '', '    - c', '', '      ~~~', '        k', '      ~~~', '', 'r[^a]'])
  assert.equal(outerNote(task + '<li id="fn2">'), outerNote(plain + '<li id="fn2">'))
})

// A separator below a note's term is lazy term text, as below an item's term (carve#3458).
const noteHosts = {
  'the document': ['[^1]: x', '  :: t'],
  'an item': ['- x', '  [^1]: x', '    :: t'],
  'a marker line': ['- [^1]: x', '    :: t'],
}
for (const [hostName, lines] of Object.entries(noteHosts)) for (const tail of [[], ['more'], [' more']]) {
  test(`a below-column separator folds into a note's term in ${hostName} (tail ${JSON.stringify(tail)})`, () => {
    const out = html([...lines, ' : zq', ...tail, '', 'r[^1]'])
    assert.match(out, new RegExp(`<dt>t\\n: zq${tail.length ? '\\nmore' : ''}</dt>`), out)
    assert.doesNotMatch(out, /<dd>/)
  })
}
