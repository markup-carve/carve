import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(readFileSync(resolve(root, 'tests/lint-authoring/expectations.json'), 'utf8'))
const engine = resolve(process.env.CARVE_JS_DIR ?? resolve(root, 'node_modules/@markup-carve/carve'))
const { lintCarve, djotMigrationWarnings } = await import(pathToFileURL(resolve(engine, 'dist/index.js')).href)

const pairs = findings => findings.map(f => [f.rule, f.line]).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
const ordered = rows => [...rows].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))

test('authoring scorecard inventory and pin declarations are complete', () => {
  assert.equal(data.version, 1)
  assert.equal(data.issue, 3792)
  const files = ['report.crv', ...['errors', 'unguided'].flatMap(dir =>
    readdirSync(resolve(root, 'tests/lint-authoring', dir)).filter(name => name.endsWith('.crv')).map(name => `${dir}/${name}`))].sort()
  assert.deepEqual(data.cases.map(c => c.file).sort(), files)
  assert.equal(data.cases.filter(c => c.file.startsWith('errors/E')).length, 14)
  assert.equal(data.cases.filter(c => c.file.startsWith('unguided/')).length, 20)
  for (const c of data.cases) {
    const source = readFileSync(resolve(root, 'tests/lint-authoring', c.file), 'utf8')
    const lines = source.split('\n')
    for (const [rule, line] of [...c.expected, ...c.optIn]) {
      assert.match(rule, /^[a-z][a-z0-9-]+$/)
      assert.ok(Number.isInteger(line) && line > 0 && line <= lines.length && lines[line - 1].trim(), `${c.file}:${line}`)
    }
    assert.deepEqual(ordered(c.aheadOfPin), ordered(c.expected.filter(row => !c.pinned.some(pin => JSON.stringify(pin) === JSON.stringify(row)))), c.file)
  }
})

for (const c of data.cases) {
  test(`authoring scorecard: ${c.file}`, () => {
    const source = readFileSync(resolve(root, 'tests/lint-authoring', c.file), 'utf8')
    const actual = pairs([...djotMigrationWarnings(source).filter(w => w.category === 'carve-breakage'), ...lintCarve(source)])
    assert.deepEqual(actual, ordered(c.pinned), `${c.file}: pinned engine changed; update the explicit ahead-of-pin declaration after implementing the rule`)
    if (!c.aheadOfPin.length) assert.deepEqual(actual, ordered(c.expected), c.file)
    if (c.file === 'report.crv' || c.file.startsWith('errors/E00')) assert.deepEqual(actual, [], c.file)
  })
}
