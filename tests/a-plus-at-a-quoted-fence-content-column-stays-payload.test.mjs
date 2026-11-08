import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const code = (source) => /<code[^>]*>([^]*?)<\/code>/.exec(renderDoc(parse(source)))?.[1]

// carve#5504, PART 9 §17 L3: a plus at a reached fence column is payload.
test('a quote attachment keeps a plus at its fence content column', () => {
  for (const quote of ['> ', '> > ']) {
    for (const fence of ['```', '~~~', '````']) {
      for (const extra of [0, 1, 2, 3]) {
        const prefix = quote + ' '.repeat(extra)
        const source = `${quote}+\n${prefix}${fence}\n${prefix}+\n`
        assert.equal(code(source), '+\n', source)
      }
    }
  }
})

test('a plus at the quote marker column can still end an attached fence', () => {
  const source = '> +\n>  ```\n> +\n'
  assert.equal(code(source), '+\n')
})
