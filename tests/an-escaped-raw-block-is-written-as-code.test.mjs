/*
 * CARVE-P10-013: a raw block a safe policy escapes is written by the fenced
 * code block path, with the raw format as its language, and reports no loss.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { carveToHtml, carveToHtmlWithReport } from '@markup-carve/carve'

const SAFE = { allowRawHtml: false }

test('the clause and its registry entry exist', () => {
  const part10 = readFileSync(new URL('../resources/spec/19-html-serialization.ebnf', import.meta.url), 'utf8')
  assert.match(part10, /AN ESCAPED RAW BLOCK IS WRITTEN AS CODE -- NORMATIVE \[CARVE-P10-013\]/)
  const rules = JSON.parse(readFileSync(new URL('../resources/spec/rules.json', import.meta.url), 'utf8'))
  assert.ok(rules.rules.some((r) => r.id === 'CARVE-P10-013'))
})

test('the ruled example escapes into pre and code with the format as its language', () => {
  const source = 'Before.\n\n```=html\n<p>raw</p>\n```\n\nAfter.\n'
  assert.equal(
    carveToHtml(source, SAFE),
    '<p>Before.</p>\n<pre><code class="language-html">&lt;p&gt;raw&lt;/p&gt;\n</code></pre>\n<p>After.</p>',
  )
})

test('the escaped raw block matches the fenced code block of its format byte for byte', () => {
  const payloads = ['<p>raw</p>\n', '<b>a & b</b>\n\n  <i>x</i>\n', '']
  const wrappers = [(b) => b, (b) => '- item\n\n' + b.replace(/^(?=.)/gm, '  '), (b) => '> ' + b.replace(/\n(?=.)/g, '\n> ')]
  for (const payload of payloads) {
    for (const wrap of wrappers) {
      const raw = wrap('```=html\n' + payload + '```\n')
      const code = wrap('```html\n' + payload + '```\n')
      assert.equal(carveToHtml(raw, SAFE), carveToHtml(code), JSON.stringify(raw))
    }
  }
})

test('escaping is not a render loss', () => {
  const result = carveToHtmlWithReport('```=html\n<p>raw</p>\n```\n', SAFE)
  assert.equal(result.totalLosses, 0)
  assert.deepEqual(result.losses, [])
})

test('raw HTML allowed still passes the payload through', () => {
  assert.equal(carveToHtml('```=html\n<p>raw</p>\n```\n', { allowRawHtml: true }), '<p>raw</p>')
})
