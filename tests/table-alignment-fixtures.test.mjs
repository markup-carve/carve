import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const fixtures = JSON.parse(readFileSync(new URL('../resources/spec/table-alignment-fixtures.json', import.meta.url)))
const wide = JSON.parse(readFileSync(new URL('../resources/spec/table-width-wide-18.json', import.meta.url)))
const segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' })

function width(text) {
  return [...segmenter.segment(text)].reduce((sum, { segment }) => sum +
    (Array.from(segment).some(char => {
      const point = char.codePointAt(0)
      return wide.some(([start, end]) => start <= point && point <= end)
    }) ? 2 : 1), 0)
}

function splitLine(line) {
  const cells = []
  let start = 1
  let end = 0
  let backslashes = 0
  for (let index = 1; index < line.length; index++) {
    const char = line[index]
    if (char === '\\') { backslashes++; continue }
    if (char === '`' && backslashes % 2 === 0) {
      // A pipe inside a code span is content, not a cell boundary.
      const run = /^`+/.exec(line.slice(index))[0]
      const close = line.slice(index + run.length).search(new RegExp(`(?<!\`)${run}(?!\`)`))
      if (close >= 0) index += run.length + close + run.length - 1
      else index += run.length - 1
      backslashes = 0
      continue
    }
    if (char === '|' && backslashes % 2 === 0) {
      cells.push(line.slice(start, index))
      start = index + 1
      end = index
    }
    backslashes = 0
  }
  return { marker: line[0], cells, attrs: line.slice(end + 1) }
}

function align(source) {
  const lines = source.trimEnd().split('\n')
  const slots = lines.filter(line => line.startsWith('|') || line.startsWith('+')).map(splitLine)
  const widths = []
  for (const slot of slots) slot.cells.forEach((cell, index) => {
    widths[index] = Math.max(widths[index] ?? 0, width(cell))
  })
  let index = 0
  return lines.map(line => {
    if (!line.startsWith('|') && !line.startsWith('+')) return line
    const slot = slots[index++]
    return slot.marker + slot.cells.map((cell, column) =>
      cell + ' '.repeat(widths[column] - width(cell)) + '|').join('') + slot.attrs
  }).join('\n') + '\n'
}

for (const { name, canonical, aligned } of fixtures) {
  test(`aligned table preserves its parsed structure: ${name}`, () => {
    const semanticTree = (source) => JSON.parse(JSON.stringify(parse(source), (key, value) =>
      key === 'rawCells' ? undefined : value))
    assert.deepEqual(semanticTree(aligned), semanticTree(canonical))
    assert.equal(renderDoc(parse(aligned)), renderDoc(parse(canonical)))
    assert.equal(align(canonical), aligned)
    assert.equal(align(aligned), aligned)
  })
}
