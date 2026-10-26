/*
 * A flattened table span and a demoted, hoisted or partial header have
 * render-loss codes.
 *
 * Markdown, plain and ANSI have no span syntax, and a pipe table has one
 * header row, written first. CARVE-P2-024 reports each loss with a named
 * message, so the schema holds them as consts and three engines emit
 * identical rows.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(resolve(repo, 'resources/render-loss-report.schema.json'), 'utf8'))
const validate = new Ajv2020({ strict: true }).compile(schema)

const SPAN = 'Flattened a spanning table cell into separate cells'
const HEADER = 'Wrote a later header row as a body row'
const HOISTED = 'Moved a header row above earlier body rows'
const CELL = 'Wrote a header cell as a body cell'
const pos = { startLine: 1, endLine: 1, startColumn: 12, endColumn: 19, startOffset: 11, endOffset: 18 }
const span = { code: 'table-span-flattened', target: 'markdown', nodeType: 'block', message: SPAN, colspan: 2, pos }
const header = { code: 'table-header-row-demoted', target: 'markdown', nodeType: 'block', message: HEADER, pos }
const hoisted = { code: 'table-header-row-hoisted', target: 'markdown', nodeType: 'block', message: HOISTED, pos }
const cell = { code: 'table-header-cell-demoted', target: 'markdown', nodeType: 'block', message: CELL, pos }
const report = (...losses) => ({ losses, totalLosses: losses.length, truncated: false })
const without = (row, key) => Object.fromEntries(Object.entries(row).filter(([name]) => name !== key))

test('a span row is accepted on markdown, plain and ansi with colspan, rowspan or both', () => {
  const rows = [
    span,
    { ...without(span, 'colspan'), rowspan: 3, target: 'plain' },
    { ...span, rowspan: 2, target: 'ansi' },
  ]
  assert.equal(validate(report(...rows)), true, JSON.stringify(validate.errors))
})

test('a span row needs a count of at least 2 and no other target', () => {
  assert.equal(validate(report(without(span, 'colspan'))), false)
  assert.equal(validate(report({ ...span, colspan: 1 })), false)
  for (const target of ['html', 'carve']) {
    assert.equal(validate(report({ ...span, target })), false, `accepted target ${target}`)
  }
  assert.equal(validate(report({ ...span, nodeType: 'inline' })), false)
  assert.equal(validate(report({ ...span, format: 'html' })), false)
})

test('a demoted header row is Markdown only and carries no span count', () => {
  assert.equal(validate(report(header)), true, JSON.stringify(validate.errors))
  assert.equal(validate(report({ ...header, target: 'plain' })), false)
  assert.equal(validate(report({ ...header, colspan: 2 })), false)
})

test('a hoisted header row and a demoted header cell are Markdown only and carry no span count', () => {
  for (const row of [hoisted, cell]) {
    assert.equal(validate(report(row)), true, JSON.stringify(validate.errors))
    for (const target of ['html', 'plain', 'ansi', 'carve']) {
      assert.equal(validate(report({ ...row, target })), false, `${row.code} accepted target ${target}`)
    }
    assert.equal(validate(report({ ...row, colspan: 2 })), false)
    assert.equal(validate(report({ ...row, rowspan: 2 })), false)
    assert.equal(validate(report({ ...row, format: 'html' })), false)
    assert.equal(validate(report({ ...row, nodeType: 'inline' })), false)
  }
})

test('no table row carries another code\'s field', () => {
  for (const extra of [{ attribute: 'x' }, { style: 'lower-alpha' }, { delim: '.' }, { emittedDelim: ')' }]) {
    for (const row of [span, header, hoisted, cell]) {
      assert.equal(validate(report({ ...row, ...extra })), false, `${row.code} accepted ${JSON.stringify(extra)}`)
    }
  }
})

test('no other code carries a span count', () => {
  const ruby = { code: 'ruby-flattened', target: 'plain', nodeType: 'inline', message: 'Flattened ruby annotations while rendering plain' }
  assert.equal(validate(report(ruby)), true, JSON.stringify(validate.errors))
  assert.equal(validate(report({ ...ruby, colspan: 2 })), false)
  assert.equal(validate(report({ ...ruby, rowspan: 3 })), false)
})

test('a message other than the named one is refused', () => {
  assert.equal(validate(report({ ...span, message: 'Flattened a table span' })), false)
  assert.equal(validate(report({ ...header, message: 'Demoted a header row' })), false)
  assert.equal(validate(report({ ...hoisted, message: HEADER })), false)
  assert.equal(validate(report({ ...cell, message: 'Wrote header cells as body cells' })), false)
})

test('the clause names every table code, its message and its CLI exception', () => {
  const clause = readFileSync(resolve(repo, 'resources/spec/22b-writer-render-loss.ebnf'), 'utf8')
    .replace(/\n\s+/g, ' ')
  for (const text of [
    SPAN, HEADER, HOISTED, CELL,
    '--allow-loss table-span-flattened', '--allow-loss table-header-row-demoted',
    '--allow-loss table-header-row-hoisted', '--allow-loss table-header-cell-demoted',
  ]) {
    assert.ok(clause.includes(`\`${text}\``), `CARVE-P2-024 no longer names ${text}`)
  }
})

test('the pinned engine reports both spans on markdown, plain and ansi and the header row on markdown', async () => {
  const { carveToAnsiWithReport, carveToHtmlWithReport, carveToMarkdownWithReport, carveToPlainTextWithReport } = await import('@markup-carve/carve')
  const spans = '|= System |= Limit | < |\n| A | Cold | 20 |\n| ^ | Hot | 10 |\n'
  for (const [render, target] of [[carveToMarkdownWithReport, 'markdown'], [carveToPlainTextWithReport, 'plain'], [carveToAnsiWithReport, 'ansi']]) {
    const { value: _value, ...result } = render(spans)
    assert.equal(validate(result), true, JSON.stringify(validate.errors))
    assert.deepEqual(result.losses.map(({ pos: _pos, ...loss }) => loss), [
      { code: 'table-span-flattened', target, nodeType: 'block', message: SPAN, colspan: 2 },
      { code: 'table-span-flattened', target, nodeType: 'block', message: SPAN, rowspan: 2 },
    ])
  }
  assert.equal(carveToHtmlWithReport(spans).totalLosses, 0)
  const headers = carveToMarkdownWithReport('|= A |= B |\n|= C |= D |\n| 1 | 2 |\n')
  assert.deepEqual(headers.losses.map(({ pos: _pos, ...loss }) => loss), [
    { code: 'table-header-row-demoted', target: 'markdown', nodeType: 'block', message: HEADER },
  ])
  assert.equal(carveToPlainTextWithReport('|= A |= B |\n|= C |= D |\n| 1 | 2 |\n').totalLosses, 0)
})
