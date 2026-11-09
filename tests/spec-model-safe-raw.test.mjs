import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source, options) => renderDoc(parse(source), options)

test('safe raw blocks use the code serializer for their format in containers', () => {
  const bodies = ['<p>raw</p>\n', '<b>a & b</b>\n\n', '']
  const containers = [(s) => s, (s) => '> ' + s.replace(/\n(?=.)/g, '\n> '), (s) => '- item\n\n' + s.replace(/^(?=.)/gm, '  ')]
  for (const body of bodies) {
    for (const container of containers) {
      const raw = container('```=html\n' + body + '```\n')
      const code = container('```html\n' + body + '```\n')
      assert.equal(html(raw, { safe: true }), html(code), JSON.stringify(raw))
    }
  }
})

test('safe raw inline is escaped text and the option does not leak between renders', () => {
  const source = '`<b>a & b</b>`{=html}'
  assert.equal(html(source, { safe: true }), '<p>&lt;b&gt;a &amp; b&lt;/b&gt;</p>')
  assert.equal(html(source), '<p><b>a & b</b></p>')
  assert.equal(html(source, { safe: true }), '<p>&lt;b&gt;a &amp; b&lt;/b&gt;</p>')
})

test('safe raw inline keeps the same smart-quote boundary as passthrough', () => {
  const source = '`a `{=html}"foo"'
  assert.equal(html(source), '<p>a ”foo”</p>')
  assert.equal(html(source, { safe: true }), '<p>a ”foo”</p>')
})

test('safe mode keeps raw content for a different format omitted', () => {
  assert.equal(html('```=latex\n\\cmd{}\n```', { safe: true }), '')
  assert.equal(html('`\\cmd{}`{=latex}', { safe: true }), '<p></p>')
})
