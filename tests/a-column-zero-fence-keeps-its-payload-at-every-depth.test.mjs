/*
 * A fence a first-block `+` takes at column zero keeps its payload whatever the
 * depth of the `+`: the enclosing items' columns lie right of the block (carve#4389).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const payload = (source) => /<code>([\s\S]*?)<\/code>/.exec(renderDoc(parse(source)))?.[1]
const hosts = ['- +', '- - +', '- - - +', '- a\n  - +', '- a\n  - b\n    - +', '1. - +', '> - - +', '- > +', '- - > +', '- > > +', '- a\n  - > +']
const fence = '```'

for (const host of hosts) {
  for (const line of ['x', ' x', '  x', '   x', '      x', '\tx']) {
    test(`${JSON.stringify(host)} keeps ${JSON.stringify(line)} in its fence`, () => {
      const quote = host.startsWith('> ') ? '> ' : ''
      const source = `${host}\n${quote}${fence}\n${quote}${line}\n${quote}${fence}\n`
      assert.equal(payload(source), `${line}\n`)
    })
  }
}

test('a line the parent strips to a closer still closes the fence', () => {
  assert.equal(payload(`- - +\n${fence}\n  ${fence}\n`), '')
})

test('a block that is not a code fence keeps its local reading', () => {
  assert.match(renderDoc(parse('- - +\n%%%\n  > y\n')), /<blockquote>/)
})
