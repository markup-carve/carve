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
// At column 0 the continuation misses the body column, so carve#5830 rule B refuses the run.
for (const [name, host] of hosts) for (const opener of [0, 1]) for (const payload of [false, true]) {
  for (const follower of ['> q', '# q', '- q', '---']) {
    const valid = opener === 1
    test(`a ${valid ? 'valid' : 'refused'} ${name} comment opened at column ${opener}${payload ? ' with a payload' : ''} leaves ${follower} a block`, () => {
      const pad = ' '.repeat(opener)
      const source = host(`${pad}{% a\n${payload ? `${pad} b\n` : ''}${pad} %}\n   ${follower}\nafter\n`)
      const run = html(source)
      const line = valid ? html(host(`${pad}{% a %}\n   ${follower}\nafter\n`)) : html(source.replace('{', '\\{'))
      assert.equal(run, line)
    })
  }
}

test('a closer short of the moved opener still refuses the run', () => {
  const source = '[^n]: p\n  {% a\n %}\n   > q\nafter\n\nx[^n]\n'
  assert.equal(html(source), html(source.replace('{', '\\{')))
})
