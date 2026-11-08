import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const codeInNote = (source, label) => {
  const note = parse(source).footnoteDefs.get(label)
  return note?.[0]?.items?.[0]?.blocks?.find(block => block.t === 'code')?.text
}

test('an attached list keeps one trailing blank in its unclosed descendant fence', () => {
  const source = '[^a]: +\n- li\n  ``` x\n  code\n\nsee[^a]\n'
  assert.equal(codeInNote(source, 'a'), 'code\n\n')
  assert.match(renderDoc(parse(source)), /<pre><code class="language-x">code\n\n<\/code><\/pre>/)
})

test('1,000 attached-list fence payloads keep the blank exactly once', () => {
  let checked = 0
  for (const label of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])
    for (const marker of ['- ', '* ', '1. ', '2. ', '3. '])
      for (const info of ['', 'x', 'js', 'txt', 'data'])
        for (const payload of ['code', '+', 'x y', '%% z']) {
          const source = `[^${label}]: +\n${marker}li\n${' '.repeat(marker.length)}\`\`\`${info}\n${' '.repeat(marker.length)}${payload}\n\nsee[^${label}]\n`
          assert.equal(codeInNote(source, label), `${payload}\n\n`, source)
          checked++
        }
  assert.equal(checked, 1000)
})
