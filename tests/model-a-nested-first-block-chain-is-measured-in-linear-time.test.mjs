import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4183: each level of a `- +` chain measured every deeper level, and each
// measurement parsed all the item bodies below it.
const chain = (depth, marker, follower) => {
  let source = ''
  for (let level = 0; level < depth; level++) source += ' '.repeat(2 * level) + marker + '\n'
  return source + follower
}
const work = (source) => {
  resetLayoutWork()
  parse(source)
  return layoutWork.scan + layoutWork.lineVisits
}

for (const marker of ['- +', '- [ ] +']) {
  for (const follower of ['```\nx\n```\n', 'para\n', '> q\n', 'para [x](u)\n', '[r]: /u\n']) {
    test(`${JSON.stringify(marker)} chain before ${JSON.stringify(follower)} costs what its input costs`, () => {
      const small = work(chain(20, marker, follower))
      const large = work(chain(40, marker, follower))
      const inputRatio = chain(40, marker, follower).length / chain(20, marker, follower).length
      assert.ok(large <= small * inputRatio * 1.3, `depth 20: ${small}, depth 40: ${large}, input ratio ${inputRatio}`)
    })
  }
}

test('a chain near the nesting cap stays in budget', () => {
  assert.ok(work(chain(150, '- +', '```\nx\n```\n')) < 1_000_000)
})

test('the measurement still attaches the block and registers a definition in it', () => {
  const nested = (body) => `<ul>\n  <li>\n    <ul>\n      <li>${body}\n      </li>\n    </ul>\n  </li>\n</ul>`
  assert.equal(renderDoc(parse(chain(2, '- +', '```\nx\n```\n'))).trim(),
    nested('\n        <pre><code>x\n</code></pre>'))
  assert.match(renderDoc(parse(chain(3, '- +', '  [r]: /u\n\n[r][]\n'))), /<a href="\/u">r<\/a>/)
})
