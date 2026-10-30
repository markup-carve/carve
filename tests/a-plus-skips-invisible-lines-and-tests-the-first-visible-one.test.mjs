// carve#4449, CARVE-P9-067: invisible lines after a `+` are skipped, and the first visible line decides.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')
const asLetter = (source) => html(source.replace(/\+(?=\n)/, 'Z')).replace(/Z/g, '+')

const hosts = ['- +', '- a\n+', '1. +', ':: t\n: +', ':: t\n: a\n+', '[^a]: +', '> +', '> - +', '> - a\n> +', '- x\n  - +']
const invisibles = ['%% c', '%%%\nc\n%%%', '%%%%\nc\n%%%%', '[r]: /u', '[^q]: n', '{x}', '{x\ny}', '%% a\n[r]: /u']
const prefix = (host, text) => {
  const last = host.split('\n').at(-1)
  // A `> ` line under `> +` is the follower that nests, not a line of the host.
  const quote = last.startsWith('> ') && host !== '> +' ? '> ' : ''
  const column = /^ +/.exec(last)?.[0] ?? ''
  return text.split('\n').map((line) => quote + column + line).join('\n')
}

for (const host of hosts) {
  for (const invisible of invisibles) {
    const lines = prefix(host, invisible)
    test(`${JSON.stringify(host)} over ${JSON.stringify(invisible)}: a blank or the end refuses, a sibling too`, () => {
      for (const tail of ['\n', '\n\ntext\n']) {
        const source = `${host}\n${lines}${tail}`
        assert.equal(html(source), asLetter(source), source)
      }
      if (!host.includes('[^a]') && !host.startsWith('> +')) {
        const sibling = host.includes(':') ? ': b' : '- b'
        const source = `${host}\n${lines}\n${prefix(host, sibling)}\n`
        if (invisible !== '[^q]: n') assert.equal(html(source), asLetter(source), source)
      }
    })
  }
  for (const invisible of ['%% c', '%%%\nc\n%%%', '[r]: /u']) {
    test(`${JSON.stringify(host)} over ${JSON.stringify(invisible)}: a block at the marker column attaches as without it`, () => {
      for (const block of ['text', '# H', '> q', '```\nk\n```']) {
        const tail = prefix(host, block)
        assert.equal(html(`${host}\n${prefix(host, invisible)}\n${tail}\n`), html(`${host}\n${tail}\n`), block)
      }
    })
    test(`${JSON.stringify(host)} over ${JSON.stringify(invisible)}: an invisible or visible line off the column refuses`, () => {
      if (host.startsWith('> +') || host.includes('[^a]')) return
      const off = `${host}\n${prefix(host, invisible.replace(/^/gm, '  '))}\n${prefix(host, 'text')}\n`
      assert.equal(html(off), asLetter(off), off)
      const visible = `${host}\n${prefix(host, invisible)}\n${prefix(host, '  text')}\n`
      assert.equal(html(visible), asLetter(visible), visible)
    })
  }
}

test('the ruling\'s Expected shapes', () => {
  assert.equal(html('- +\n%% c\n\ntext\n'), '<ul><li>+</li></ul><p>text</p>')
  assert.equal(html('- +\n%% c\n- b\n'), '<ul><li>+</li><li>b</li></ul>')
  assert.equal(html('- +\n%% c\n  text\n'), html('- Z\n%% c\n  text\n').replace('Z', '+'))
  assert.equal(html('- +\n%% c\ntext\n'), '<ul><li>text</li></ul>')
  assert.equal(html('- +\n%%%\nc\n%%%\ntext\n'), '<ul><li>text</li></ul>')
})

test('a note definition keeps its lazy body, so nothing follows it', () => {
  assert.equal(html('- +\n[^q]: n\ntext\n'), '<ul><li>+</li></ul>')
  assert.equal(html('- +\n[^q]: n\n# H\n'), '<ul><li><h1 id="H">H</h1></li></ul>')
})

test('a nested + is refused by an invisible line left of its marker', () => {
  assert.equal(html('- a\n  * +\n%% c\n  after\n'), html('- a\n  * Z\n%% c\n  after\n').replace('Z', '+'))
})
