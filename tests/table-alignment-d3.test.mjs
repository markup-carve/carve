import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const cell = source => parse(source).blocks[0].rows[0].cells[0]
const html = source => renderDoc(parse(source))

test('D3 alignment is consumed only at the start of a cell attribute block', () => {
  assert.deepEqual(
    ['|{>^ .num} x |', '|{?v} x |', '|={~} x |'].map(source => {
      const { header, align, valign, attrs, content } = cell(`${source}\n`)
      return { header, align, valign, attrs, content }
    }),
    [
      { header: false, align: 'right', valign: 'top', attrs: '{.num}', content: 'x' },
      { header: false, align: null, valign: 'bottom', attrs: null, content: 'x' },
      { header: true, align: 'center', valign: null, attrs: null, content: 'x' },
    ],
  )
  for (const source of ['|{> ^} x |', '|{> ^ ~} x |', '|{.num >} x |', '|{?} x |']) {
    assert.equal(cell(`${source}\n`).content, source.slice(1, -1).trim())
  }
})

test('header-kind colspan and alignment-only span blocks preserve column defaults', () => {
  assert.match(html('|=< |\n| x |\n'), /<thead>[\s\S]*<th scope="col"><\/th>/)
  assert.match(html('|={>} Price |{<} < |={~} Stock |\n| 12 | EUR | 3 |\n'),
    /<td style="text-align: left;">EUR<\/td>/)
  assert.equal(cell('|=^|\n').content, '=^')
  assert.equal(cell('|=<|\n').content, '=<')
  assert.equal(cell('|=^ |\n').spanMarker, '^')
  assert.equal(cell('|=< |\n').spanMarker, '<')
})

test('released marker spellings retain their tree and have lint migration vectors', () => {
  const vectors = JSON.parse(readFileSync(new URL('../resources/spec/table-alignment-lint-vectors.json', import.meta.url)))
  assert.equal(vectors.rule, 'deprecated-cell-alignment')
  assert.equal(vectors.fix, 'fmt')
  assert.equal(vectors.vectors.length, 5)
  for (const vector of vectors.vectors) {
    assert.doesNotThrow(() => parse(vector.fixed), vector.name)
    assert.equal(html(vector.source), html(vector.fixed), vector.name)
  }
})
