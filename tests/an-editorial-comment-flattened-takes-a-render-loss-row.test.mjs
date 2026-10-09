/*
 * A flattened editorial comment has a render-loss code, and the wire shape is
 * closed around it.
 *
 * Plain and ANSI write a `{# ... #}` comment as bare text, so the note reads as
 * part of the author's sentence. CARVE-P2-024 reports that the way it reports
 * `ruby-flattened`, with one difference: the clause names the message, so the
 * schema holds it as a const and three engines emit identical rows.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { carveToAnsiWithReport, carveToMarkdownWithReport, carveToPlainTextWithReport } from '@markup-carve/carve'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(resolve(repo, 'resources/render-loss-report.schema.json'), 'utf8'))
const validate = new Ajv2020({ strict: true }).compile(schema)

const MESSAGE = 'Flattened an editorial comment into the surrounding text'
const pos = { startLine: 1, endLine: 1, startColumn: 23, endColumn: 31, startOffset: 22, endOffset: 31 }
const row = { code: 'editorial-comment-flattened', target: 'plain', nodeType: 'inline', message: MESSAGE, pos }
const report = (...losses) => ({ losses, totalLosses: losses.length, truncated: false })

test('the render channel accepts a flattened comment row on plain and ansi', () => {
  assert.equal(validate(report(row, { ...row, target: 'ansi' })), true, JSON.stringify(validate.errors))
})

test('a flattened comment row carrying a format is refused', () => {
  assert.equal(validate(report({ ...row, format: 'html' })), false)
})

test('a flattened comment row is refused at block level', () => {
  assert.equal(validate(report({ ...row, nodeType: 'block' })), false)
})

test('a message other than the named one is refused', () => {
  const refused = [
    'Flattened an editorial comment',
    'Flattened an editorial comment into the surrounding text while rendering plain',
    'flattened an editorial comment into the surrounding text',
    '',
  ]
  for (const message of refused) {
    assert.equal(validate(report({ ...row, message })), false, `accepted ${JSON.stringify(message)}`)
  }
})

test('the clause names the code, the message and the CLI exception the schema holds', () => {
  const clause = readFileSync(resolve(repo, 'resources/spec/04-blocks-tables-containers.ebnf'), 'utf8')
    .replace(/\n\s+/g, ' ')
  assert.ok(clause.includes(`\`${MESSAGE}\``), 'CARVE-P2-024 no longer names the message')
  assert.ok(clause.includes('`--allow-loss editorial-comment-flattened`'))
  const branch = schema.properties.losses.items.oneOf.find(
    (one) => one.properties?.code?.const === 'editorial-comment-flattened',
  )
  assert.equal(branch.properties.message.const, MESSAGE)
})

test('the pinned engine emits the row on plain and ansi and none on markdown', () => {
  const source = 'Text {+neu+} und {#Notiz#} hier.\n'
  for (const [render, target] of [[carveToPlainTextWithReport, 'plain'], [carveToAnsiWithReport, 'ansi']]) {
    const { value: _value, ...result } = render(source)
    assert.equal(validate(result), true, JSON.stringify(validate.errors))
    assert.deepEqual(result.losses.map(({ pos: _pos, ...loss }) => loss), [
      { code: 'editorial-comment-flattened', target, nodeType: 'inline', message: MESSAGE },
    ])
  }
  const markdown = carveToMarkdownWithReport(source)
  assert.equal(markdown.totalLosses, 0)
  const fixtures = JSON.parse(readFileSync(resolve(repo, 'tests/fixtures/markdown-writer-targets.json'), 'utf8'))
  for (const name of ['editorial-comment-span', 'editorial-comment-content-is-text']) {
    const c = fixtures.find((f) => f.name === name)
    assert.equal(carveToMarkdownWithReport(c.carve).value, c.markdown, name)
  }
})
