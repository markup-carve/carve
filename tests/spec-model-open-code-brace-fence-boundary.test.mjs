import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse as modelParse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { parse as engineParse, renderHtml } from '@markup-carve/carve'

const model = (source) => renderDoc(modelParse(source))
const engine = (source) => renderHtml(engineParse(source))

test('carve#5632: a fence interrupts after a brace inside open inline code', () => {
  const source = 'p\n foo](`url)\n {.x\n .y}\n ```\n z\n'
  const expected = '<p>p\nfoo](<code>url)\n{.x\n.y}</code></p>\n<pre><code>z\n</code></pre>'
  assert.equal(model(source), expected)
  assert.equal(engine(source), expected)
})

for (const head of ['p', 'prefix', 'a [link](url)']) {
  for (const brace of ['{.x\n.y}', '{#id\n.class}', '{% note\ntext %}']) {
    for (const fence of ['```', '~~~~']) {
      test(`an open inline code span keeps ${brace.split('\n')[0]} literal before ${fence}`, () => {
        const source = `${head}\n \`open\n ${brace.replaceAll('\n', '\n ')}\n ${fence}\n z\n`
        assert.equal(model(source), engine(source))
        assert.match(model(source), /<\/p>\n<pre><code>z\n<\/code><\/pre>$/)
      })
    }
  }
}

for (const [name, source] of [
  ['unattached caption', '^ `open\n {.x\n .y}\n ```\n z\n'],
  ['quote caption', '> quote\n^ `open\n {.x\n .y}\n ```\n z\n'],
  ['table caption', '|= a |\n| b |\n^ `open\n {.x\n .y}\n ```\n z\n'],
]) {
  test(`a ${name} ends its open inline code at the later fence`, () => {
    assert.equal(model(source), engine(source))
    assert.match(model(source), /<pre><code>z\n<\/code><\/pre>$/)
  })
}
