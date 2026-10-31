// carve#4449, CARVE-P9-067: an abbreviation definition is skipped after a `+` like a link definition.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\n\s*/g, '')
const defined = (source) => html(source).replace(/<abbr title="b">A<\/abbr>/g, 'A')

const hosts = ['- +', '- a\n+', '1. +', '- [ ] +', ':: t\n: +', ':: t\n: a\n+', '[^a]: +', '> +']
const tails = ['text\n', '# H\n', '> q\n', '- b\n', '\ntext\n', '  text\n', '%% c\ntext\n', '']

for (const host of hosts) {
  test(`${JSON.stringify(host)}: an abbreviation definition reads like a link definition and defines`, () => {
    for (const tail of tails) {
      const abbreviation = `${host}\n*[A]: b\n${tail}\nA\n`
      assert.match(html(abbreviation), /<abbr title="b">A<\/abbr>/, abbreviation)
      assert.equal(defined(abbreviation), html(`${host}\n[r]: /u\n${tail}\nA\n`), abbreviation)
    }
  })
}

test('under a host in a quote or an item the line is text and the + attaches it', () => {
  assert.equal(html('> - +\n> *[A]: b\n> text\n\nA\n'), '<blockquote><ul><li>*[A]: btext</li></ul></blockquote><p>A</p>')
  assert.equal(html('- x\n  - +\n  *[A]: b\n  text\n\nA\n'), '<ul><li>x<ul><li>*[A]: btext</li></ul></li></ul><p>A</p>')
})

test('a later definition of the same term still wins', () => {
  assert.match(html('- +\n*[A]: b\ntext\n\n*[A]: c\n\nA\n'), /<abbr title="c">A<\/abbr>/)
  assert.match(html('*[A]: c\n\n- +\n*[A]: b\ntext\n\nA\n'), /<abbr title="b">A<\/abbr>/)
})
