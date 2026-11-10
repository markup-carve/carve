import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// carve#5762: the ownership walk moves a lazy `{%` line into its owner. The
// opener is still measured at the column it was written in (CARVE-P2-035).
const hosts = [
  ['note', (body) => `[^n]: p\n${body}\nx[^n]\n`],
  ['item', (body) => `- p\n${body}`],
]
for (const [name, host] of hosts) for (const opener of [0, 1]) for (const payload of [false, true]) {
  for (const follower of ['> q', '# q', '- q', '---']) {
    test(`a valid ${name} comment opened at column ${opener}${payload ? ' with a payload' : ''} leaves ${follower} a block`, () => {
      const pad = ' '.repeat(opener)
      const run = html(host(`${pad}{% a\n${payload ? `${pad} b\n` : ''}${pad} %}\n   ${follower}\nafter\n`))
      const line = html(host(`${pad}{% a %}\n   ${follower}\nafter\n`))
      assert.equal(run, line)
    })
  }
}

test('a closer short of the moved opener still refuses the run', () => {
  const out = html('[^n]: p\n  {% a\n %}\n   > q\nafter\n\nx[^n]\n')
  assert.match(out, /<p>p\n\{% a\n%\}\n&gt; q\nafter/)
})
