import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { parseFragment } from 'parse5'
import { cmarkGfmToHtml } from './lib/markdown-oracle.mjs'

const engine = await import(process.env.CARVE_JS_MODULE ?? '@markup-carve/carve')
const path = new URL('../tests/fixtures/markdown-inline-hard-breaks.json', import.meta.url)
const cases = JSON.parse(readFileSync(path))
const breakPaths = (html) => {
  const paths = []
  const visit = (node, ancestors = []) => {
    const next = node.tagName ? [...ancestors, node.tagName] : ancestors
    if (node.tagName === 'br') paths.push(next)
    for (const child of node.childNodes ?? []) visit(child, next)
  }
  visit(parseFragment(html))
  return paths
}
for (const item of cases) {
  item.markdown = engine.renderMarkdown(engine.fromAstJson(item.ast))
  assert.deepEqual(breakPaths(cmarkGfmToHtml(item.markdown)), item.ancestors, `${item.template}: ${item.name}`)
}
writeFileSync(path, JSON.stringify(cases, null, 2) + '\n')
console.log(`Generated ${cases.length} inline-break cases with native ancestor checks`)
