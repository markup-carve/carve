import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const { cases } = JSON.parse(readFileSync(resolve(root, 'tests/lint-authoring/expectations.json'), 'utf8'))
const engine = resolve(process.env.CARVE_JS_DIR ?? resolve(root, 'node_modules/@markup-carve/carve'))
const { lintCarve } = await import(pathToFileURL(resolve(engine, 'dist/index.js')).href)

for (const entry of cases.filter(row => row.optIn?.length)) {
  test(`authoring opt-in: ${entry.file}`, () => {
    const source = readFileSync(resolve(root, 'tests/lint-authoring', entry.file), 'utf8')
    const findings = lintCarve(source, { captionLookingParagraph: true })
      .filter(row => row.rule === 'caption-looking-paragraph')
      .map(row => [row.rule, row.line])
    assert.deepEqual(findings, entry.optIn)
    assert.equal(lintCarve(source).some(row => row.rule === 'caption-looking-paragraph'), false)
  })
}
