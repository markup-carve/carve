import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { parse as parseEngine, renderMarkdownWithReport } from '@markup-carve/carve'

const dir = resolve('tests/include-caption-corpus')
for (const file of readdirSync(dir).filter(name => name.endsWith('.json'))) {
  const row = JSON.parse(readFileSync(resolve(dir, file), 'utf8'))
  test(`PART 10 caption: ${row.name}`, () => {
    const doc = parse(row.source, { includeFiles: row.files })
    assert.equal(renderDoc(doc), row.expected.html)
    assert.deepEqual(doc.blocks.map(block => ({
      type: block.t,
      ...(block.caption === undefined ? {} : { caption: block.caption }),
      ...(block.t === 'includeLiteral' ? { text: block.text } : {}),
    })), row.expected.ast)
    if (row.expected.markdown) {
      const csv = row.files['data/plans.csv']
      const authored = `{table}\n\`\`\`csv\n${csv}\`\`\`\n^ Plans`
      const report = renderMarkdownWithReport(parseEngine(authored))
      assert.equal(row.expected.markdown, report.value)
      assert.deepEqual(report.losses.map(loss => loss.code), [row.expected.markdownLoss])
      assert.doesNotMatch(row.expected.markdown, /\^ Plans/)
    }
  })
}
