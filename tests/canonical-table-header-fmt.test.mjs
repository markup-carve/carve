import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { carveToCarve, carveToHtml } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/canonical-table-header-fmt.json', import.meta.url), 'utf8'))

test('canonical table fixture has the intended writer contract', () => {
  assert.equal(fixture.version, 1)
  assert.equal(fixture.clause, 'CARVE-P11-066')
  assert.equal(fixture.rows.length, 3)
})

for (const row of fixture.rows) {
  test(`${row.id}: fmt writes native headers and preserves rendered HTML`, () => {
    assert.equal(renderDoc(parse(row.fmt)), renderDoc(parse(row.source)))
    assert.equal(carveToHtml(row.fmt), carveToHtml(row.source))
    assert.equal(carveToCarve(row.source), row.fmt)
    assert.equal(carveToCarve(row.fmt), row.fmt)
  })
}

test('960 table variants preserve HTML when the separator becomes native headers', () => {
  const containers = [
    source => source,
    source => source.split('\n').filter(Boolean).map(line => `> ${line}`).join('\n') + '\n',
    source => source.split('\n').filter(Boolean).map(line => `> > ${line}`).join('\n') + '\n',
    source => `::: note\n${source}:::\n`,
    source => `- item\n+\n${source}`,
  ]
  const markers = ['', '<', '~', '>']
  let count = 0
  for (const wrap of containers) for (let columns = 1; columns <= 4; columns++) {
    for (let alignment = 0; alignment < 4; alignment++) for (let width = 1; width <= 4; width++) {
      for (let extra = 0; extra <= 2; extra++) {
        const heads = Array.from({ length: columns }, (_, index) => `H${index}`)
        const cells = Array.from({ length: columns + extra }, (_, index) => `v${index}`)
        const marker = markers[alignment]
        const separator = heads.map(() => `${marker === '<' || marker === '~' ? ':' : ''}${'-'.repeat(width)}${marker === '>' || marker === '~' ? ':' : ''}`)
        const source = wrap(`| ${heads.join(' | ')} |\n|${separator.join('|')}|\n| ${cells.join(' | ')} |\n`)
        const fmt = wrap(`|${heads.map(head => `=${marker} ${head} `).join('|')}|\n| ${cells.join(' | ')} |\n`)
        assert.equal(renderDoc(parse(fmt)), renderDoc(parse(source)), `spec model variant ${count}`)
        assert.equal(carveToHtml(fmt), carveToHtml(source), `pinned JS variant ${count}`)
        count++
      }
    }
  }
  assert.equal(count, 960)
})
