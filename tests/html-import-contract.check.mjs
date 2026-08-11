import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('./html-import/', import.meta.url)

test('every HTML import fixture publishes all four contract files', async () => {
  const fixtures = await readdir(root, { withFileTypes: true })
  assert.ok(fixtures.length > 0)
  for (const fixture of fixtures.filter((entry) => entry.isDirectory())) {
    const names = new Set(await readdir(new URL(`${fixture.name}/`, root)))
    assert.deepEqual([...names].sort(), ['expected.ast.json', 'expected.crv', 'expected.report.json', 'input.html'])
    for (const json of ['expected.ast.json', 'expected.report.json']) {
      JSON.parse(await readFile(new URL(`${fixture.name}/${json}`, root), 'utf8'))
    }
  }
})

test('the report schema and fixture vocabulary agree', async () => {
  const schema = JSON.parse(await readFile(new URL('../resources/html-import-schema.json', import.meta.url), 'utf8'))
  const allowed = new Set(schema.properties.diagnostics.items.properties.code.enum)
  for (const fixture of await readdir(root, { withFileTypes: true })) {
    if (!fixture.isDirectory()) continue
    const report = JSON.parse(await readFile(new URL(`${fixture.name}/expected.report.json`, root), 'utf8'))
    for (const diagnostic of report.diagnostics) assert.ok(allowed.has(diagnostic.code), diagnostic.code)
  }
})
