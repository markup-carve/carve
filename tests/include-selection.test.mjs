import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const corpus = JSON.parse(readFileSync(new URL('./include-selection/cases.json', import.meta.url)))
for (const row of corpus.cases) {
  test(row.name, () => {
    const lang = row.lang ?? 'csv'
    const section = row.options.startsWith('#') ? row.options.split(' ')[0] : ''
    const options = section ? row.options.slice(section.length).trimStart() : row.options
    const directive = `{{ data.${lang}${section} @code:${lang} ${options} }}`
    const source = `${row.attrs ? `${row.attrs}\n` : ''}${directive}${row.caption ? `\n^ ${row.caption}` : ''}`
    const html = renderDoc(parse(source, { includeFiles: { [`data.${lang}`]: row.file } }))
    if (row.codeFallback) assert.ok(!html.includes('<table>'), html)
    else if (row.literal) {
      assert.ok(!html.includes('<table>'), html)
      assert.ok(html.includes(directive), `${row.name}: ${html}`)
    }
    else assert.ok(html.includes('<table>'), html)
    for (const value of row.html ?? []) assert.ok(html.includes(value), `${row.name}: ${value}\n${html}`)
    for (const value of row.absent ?? []) assert.ok(!html.includes(value), `${row.name}: absent ${value}\n${html}`)
  })
}

test('1024 generated record and column projections', () => {
  const findTable = value => {
    if (!value || typeof value !== 'object') return null
    if (value.t === 'table') return value
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) {
        for (const item of child) {
          const table = findTable(item)
          if (table) return table
        }
      } else {
        const table = findTable(child)
        if (table) return table
      }
    }
    return null
  }
  let count = 0
  for (const separator of [',', '\t']) {
    for (const headerRows of [0, 1]) {
      for (const first of [1, 2, 3, 4]) {
        for (const lastOffset of [0, 1, 2, 3]) {
          for (const shift of [0, 1, 2, 3]) {
            for (const width of [2, 3, 4, 5]) {
              const lang = separator === ',' ? 'csv' : 'tsv'
              const names = Array.from({ length: 7 }, (_, i) => `C${i + shift}`)
              const body = Array.from({ length: 8 }, (_, r) => names.map((_, c) => `R${r + 1}C${c}`))
              const rows = headerRows ? [names, ...body] : body
              const selectedColumns = Array.from({ length: width - 1 }, (_, i) => i + shift)
              const cols = headerRows
                ? `@cols:"${selectedColumns.map(i => names[i]).join(',')}"`
                : `@cols:${selectedColumns[0] + 1}-${selectedColumns.at(-1) + 1}`
              const start = first + headerRows
              const end = start + lastOffset
              const source = `{table header-rows=${headerRows}}\n{{ data.${lang} @code:${lang} @rows:${start}-${end} ${cols} }}`
              const hosted = [source, source.split('\n').map(line => `> ${line}`).join('\n'),
                `- ${source.split('\n').join('\n  ')}`, `::: note\n${source}\n:::`][lastOffset]
              let nested = `${hosted}\n\nTail.`
              for (let depth = 0; depth < shift; depth++) nested = nested.split('\n').map(line => `> ${line}`).join('\n')
              const tree = parse(nested, { includeFiles: { [`data.${lang}`]: rows.map(row => row.join(separator)).join('\n') + '\n' } })
              const table = findTable(tree.blocks)
              assert.ok(table, `${lang}, ${headerRows}, ${first}, ${lastOffset}, ${shift}, ${width}`)
              const values = table.rows.map(row => row.cells.map(cell => cell.content))
              const expectedHeader = headerRows ? [selectedColumns.map(i => names[i])] : []
              const expectedBody = body.slice(first - 1, first + lastOffset).map(row => selectedColumns.map(i => row[i]))
              assert.deepEqual(values, [...expectedHeader, ...expectedBody])
              count++
            }
          }
        }
      }
    }
  }
  assert.equal(count, 1024)
})
