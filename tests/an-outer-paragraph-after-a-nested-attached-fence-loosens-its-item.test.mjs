import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

for (const outer of ['-', '*']) for (const inner of ['-', '*', '1.']) for (const fence of ['```', '~~~']) for (const quote of ['', '> ']) {
  test(`outer paragraph after ${outer} ${inner} + ${fence} blank in ${quote || 'root'} is loose`, () => {
    const lines = [`${outer} ${inner} +`, `  ${fence}`, '', '  tail', `    ${fence}`]
    const source = lines.map(line => quote ? `${quote}${line}`.trimEnd() : line).join('\n') + '\n'
    const out = renderDoc(parse(source))
    assert.match(out, fence === '```' ? /<p>tail\n<code><\/code><\/p>/ : /<p>tail\n~~~<\/p>/, source)
  })
}

test('a later fence owned by the outer item keeps its payload blank', () => {
  const source = '- - +\n  ```\n  ```\n  ```\n\n  payload\n  ```\n- sibling\n'
  const out = renderDoc(parse(source))
  assert.match(out, /<pre><code>\npayload\n<\/code><\/pre>/)
  assert.match(out, /<li>sibling<\/li>/)
})
