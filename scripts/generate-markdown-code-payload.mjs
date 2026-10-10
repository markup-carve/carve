import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { parseFragment } from 'parse5'
import { cmarkGfmToHtml } from './lib/markdown-oracle.mjs'

const engine = await import(process.env.CARVE_JS_MODULE ?? '@markup-carve/carve')
const root = new URL('../', import.meta.url)
const inputs = JSON.parse(readFileSync(new URL('tests/fixtures/markdown-code-payload-inputs.json', root)))
const text = (node) => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('')
const codes = (html) => {
  const records = []
  const visit = (node, ancestors = []) => {
    if (node.tagName === 'pre') return
    const path = node.tagName && node.tagName !== 'section' ? [...ancestors, node.tagName] : ancestors
    if (node.tagName === 'code') { records.push({ value: text(node), ancestors: path, elements: (node.childNodes ?? []).filter(child => child.tagName).map(child => child.tagName) }); return }
    for (const child of node.childNodes ?? []) visit(child, path)
  }
  visit(parseFragment(html))
  return records
}
const replaceCode = (node, value) => {
  if (Array.isArray(node)) { for (const child of node) replaceCode(child, value); return }
  if (!node || typeof node !== 'object') return
  if (node.type === 'code') node.value = value
  for (const [key, child] of Object.entries(node)) if (key !== 'pos') replaceCode(child, value)
}
const rows = []
for (const template of inputs.templates) for (const value of inputs.values) {
  const document = engine.parse(template)
  replaceCode(document, value)
  const expected = codes(engine.renderHtml(document))
  assert.equal(expected.length, 1)
  assert.equal(expected[0].value, value)
  const markdown = engine.renderMarkdown(document)
  assert.deepEqual(codes(cmarkGfmToHtml(markdown)), expected, `${template}: ${JSON.stringify(value)}`)
  rows.push({ rule: 'CARVE-P11-064', template, value, markdown, ancestors: expected[0].ancestors })
}
writeFileSync(new URL('tests/fixtures/markdown-code-payload.json', root), JSON.stringify(rows, null, 2) + '\n')
console.log(`Generated ${rows.length} code payloads with native Markdown value and context checks`)
