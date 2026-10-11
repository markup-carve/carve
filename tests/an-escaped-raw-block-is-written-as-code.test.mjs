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

test('literal raw payload vectors preserve EOF bytes through AST interchange', async () => {
  const { parse, renderHtml, toAstJson, fromAstJson } = await import('@markup-carve/carve')
  const vectors = JSON.parse(readFileSync(new URL('./fixtures/raw-payload-termination.json', import.meta.url), 'utf8'))
  for (const { id, raw, codeContent, rawPassthrough } of vectors) {
    const doc = { type: 'document', srcByteLength: 0, children: [raw] }
    const back = fromAstJson(toAstJson(doc))
    assert.deepEqual(toAstJson(back).children, [raw], id)
    const code = { ...doc, children: [{ type: 'code_block', lang: 'html', content: codeContent }] }
    assert.equal(renderHtml(back, SAFE), renderHtml(code), id)
    assert.equal(renderHtml(back), rawPassthrough, id)
  }
  for (const format of ['html', 'latex', 'markdown']) {
    for (const payload of ['', '\n', '\n\n', 'x', 'x\n', 'x\n\n', ' \t', '\u00a0']) {
      assert.equal(parse('```=' + format + '\n' + payload).children[0].content, payload)
    }
  }
})

test('safe and profile raw fallback matches code across source boundaries', async () => {
  const { Profile } = await import('@markup-carve/carve')
  const vectors = JSON.parse(readFileSync(new URL('../resources/raw-payload-source-fixtures.json', import.meta.url), 'utf8'))
  for (const { id, source, codeSource } of vectors) {
    assert.equal(carveToHtml(source, SAFE), carveToHtml(codeSource), id)
    const options = { profile: Profile.article() }
    assert.equal(carveToHtml(source, options), carveToHtml(codeSource, options), id)
  }
})
