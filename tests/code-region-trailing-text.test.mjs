import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const entry = (name) => `{{ child @code:txt @region:${name} }}\n`
const literal = (name) => `<p>{{ child @code:txt @region:${name} }}</p>`
const html = (source, name = 'r') => renderDoc(parse(entry(name), { includeFiles: { child: source } })).trim()

test('I1b rejects trailing text after a recognized code region name', () => {
  const forms = [['//', ''], ['--', ''], ['/*', '*/'], ['<!--', '-->']]
  let count = 0
  for (const [open, close] of forms) for (const name of ['r', 'r_1', 'R', 'long-name']) {
    for (const extra of ['extra', 'x=1', 'α', '#region']) for (const indent of ['', ' ', '  ', '\t']) {
      for (const gap of [' ', '  ', '\t', ' \t']) {
        const source = `${indent}${open} #region ${name}${gap}${extra}${close ? ` ${close}` : ''}\nx\n${open} #endregion ${name}${close ? ` ${close}` : ''}`
        assert.equal(html(source, name), literal(name), source)
        count++
      }
    }
  }
  assert.equal(count, 1024)
})

test('a whole-line code region marker still selects its body', () => {
  assert.equal(html('// #region r\nx\n// #endregion r'), '<pre><code class="language-txt">x\n</code></pre>')
})
