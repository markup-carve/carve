import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/verbatim-opener-line-fmt.json', import.meta.url), 'utf8'))
const model = source => renderDoc(parse(source))
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const readsBack = (source, value) => model(source).includes(`<code>${escape(value)}</code>`)

// first-line prefix, continuation prefix, lines before and after the paragraph
const HOSTS = {
  paragraph: ['', '', '', ''],
  quote: ['> ', '> ', '', ''],
  bullet: ['- ', '  ', '', ''],
  ordered: ['1. ', '   ', '', ''],
  description: [': ', '  ', ':: t\n', ''],
  footnote: ['[^n]: ', '  ', 'y[^n]\n\n', ''],
  div: ['', '', '::: d\n', '\n:::'],
}

// The writer's candidate spellings, and wider ones: fence widths, padding,
// the continuation lines past the content column and below it.
function candidates(host, value) {
  const [first, cont, before, after] = HOSTS[host]
  const [head, ...rest] = value.split('\n')
  const out = []
  for (const fence of ['`', '``', '```']) {
    for (const pad of ['', ' ']) {
      for (const prefix of [cont, ...[1, 2, 3, 4].map(n => cont + ' '.repeat(n)), ...[0, 1].map(n => ' '.repeat(n))]) {
        const body = rest.map((line, i) => prefix + line + (i === rest.length - 1 ? pad + fence : ''))
        out.push(`${before}${first}${fence}${pad}${head}\n${body.join('\n')}${after}\n`)
      }
    }
  }
  return out
}

test('verbatim opener line fixture names its clause', () => {
  assert.equal(fixture.version, 1)
  assert.equal(fixture.clause, 'CARVE-P11-078')
  assert.equal(fixture.rows.filter(row => row.source).length, 14)
  assert.equal(fixture.rows.filter(row => !row.source).length, 35)
})

for (const row of fixture.rows) {
  if (row.source) {
    test(`${row.id}: the spelling reads back`, () => {
      assert.ok(readsBack(row.source, row.value), model(row.source))
    })
  } else {
    test(`${row.id}: no candidate spelling reads ${JSON.stringify(row.value)} back in host ${row.host}`, () => {
      for (const source of candidates(row.host, row.value)) {
        assert.ok(!readsBack(source, row.value), source)
      }
    })
  }
}
