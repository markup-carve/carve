import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { qualityAdapter } from '../scripts/lib/quality-adapter.mjs'
import { checkQualityCases } from '../scripts/lib/quality-check.mjs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { sourceQualityCases, importQualityCases } from '../scripts/lib/quality-cases.mjs'

test('generated fence payloads agree with the executable specification', () => {
  const cases = sourceQualityCases()
  assert.equal(cases.length, 24)
  assert.deepEqual(cases, sourceQualityCases())
  for (const row of cases) {
    assert.ok(renderDoc(parse(row.source)).includes(`<pre><code>${row.payload}</code></pre>`), row.id)
  }
})

test('import combinations retain distinct case identities and modes', () => {
  const cases = importQualityCases()
  assert.equal(cases.length, 24)
  assert.equal(new Set(cases.map((row) => row.id)).size, cases.length)
  assert.deepEqual([...new Set(cases.map((row) => row.mode))], ['safe', 'semantic', 'roundtrip'])
})

const engines = ['js', 'php', 'rust'].map((name) => ({name, cwd: process.cwd()}))
const fakeRun = (_engine, action, source, mode) => {
  if (action === 'import') {
    const row = importQualityCases().find((row) => row.source === source && row.mode === mode)
    const diagnostics = row.expectedCodes.map((code, i) => ({code, message: 'Test diagnostic', severity: 'warning', fidelity: 'dropped', confidence: 'exact', path: `/host/span[${i + 1}]`}))
    return {source, report: {schemaVersion: 2, sourceFormat: 'html', mode, diagnostics}}
  }
  if (action === 'html' || action === 'fromJson') {
    const row = sourceQualityCases().find((row) => row.source === source)
    return row ? `<pre><code>${row.payload}</code></pre>` : importQualityCases().find((row) => row.source === source)?.expectedHtml ?? source
  }
  return source
}

test('the quality gate accepts matching round trips and diagnostic reports', () => {
  const result = checkQualityCases(engines, fakeRun)
  assert.equal(result.results.length, 144)
  assert.ok(result.results.every((row) => row.failures.length === 0))
  assert.deepEqual(result.crossEngine, [])
  assert.deepEqual(result.crossDiagnostics, [])
})

test('the quality gate requires three engines and records adapter failures', () => {
  assert.throws(() => checkQualityCases(engines.slice(1), fakeRun), /three distinct/)
  assert.throws(() => checkQualityCases([engines[0], engines[0], engines[2]], fakeRun), /three distinct/)
  const result = checkQualityCases(engines, (engine, ...args) => {
    if (engine.name === 'rust') throw new Error('adapter unavailable')
    return fakeRun(engine, ...args)
  })
  assert.equal(result.results.filter((row) => row.failures.includes('adapter-error')).length, 48)
  assert.equal(result.crossEngine.length, 48)
  assert.equal(result.crossDiagnostics.length, 24)
})

test('format, JSON and diagnostic differences fail independently', () => {
  const result = checkQualityCases(engines, (engine, action, source, mode) => {
    if (engine.name === 'rust' && action === 'fmt') return source + '!'
    if (engine.name === 'php' && action === 'fromJson') return 'changed'
    const output = fakeRun(engine, action, source, mode)
    if (engine.name === 'php' && action === 'import') {
      output.report.mode = 'wrong'
      output.report.diagnostics.push({code: 'attribute-stripped', severity: 'warning', fidelity: 'lossy', confidence: 'high', path: '/p[1]'})
    }
    return output
  })
  assert.ok(result.results.some((row) => row.failures.includes('format-meaning')))
  assert.ok(result.results.some((row) => row.failures.includes('format-idempotence')))
  assert.ok(result.results.some((row) => row.failures.includes('json-meaning')))
  assert.ok(result.results.some((row) => row.failures.includes('diagnostic-envelope')))
  assert.equal(result.crossDiagnostics.length, 24)
})

test('malformed diagnostic rows are recorded without aborting the report', () => {
  for (const bad of [null, {code: 'attribute-dropped', severity: 'warning'}]) {
    const result = checkQualityCases(engines, (engine, action, source, mode) => {
      const output = fakeRun(engine, action, source, mode)
      if (action === 'import') output.report.diagnostics = [bad]
      return output
    })
    assert.equal(result.results.filter((row) => row.failures.includes('diagnostic-envelope')).length, 72)
  }
})

test('agreement cannot hide missing import content or diagnostics', () => {
  const result = checkQualityCases(engines, (engine, action, source, mode) => {
    const output = fakeRun(engine, action, source, mode)
    if (action === 'import') {
      output.source = '<span onclick="go()">x</span>'
      output.report.diagnostics = []
    }
    return output
  })
  assert.equal(result.crossEngine.length, 0)
  assert.equal(result.results.filter((row) => row.failures.includes('import-meaning')).length, 72)
  assert.ok(result.results.some((row) => row.failures.includes('diagnostic-expectation')))
  assert.ok(result.results.some((row) => row.failures.includes('diagnostic-attribution')))
})

test('consecutive diagnostic duplicates do not impose row granularity', () => {
  const result = checkQualityCases(engines, (engine, action, source, mode) => {
    const output = fakeRun(engine, action, source, mode)
    if (engine.name === 'rust' && action === 'import') output.report.diagnostics = output.report.diagnostics.flatMap((row) => [row, {...row}])
    return output
  })
  assert.ok(result.results.every((row) => row.failures.length === 0))
  assert.deepEqual(result.crossDiagnostics, [])
})

test('working directories are required', () => {
  assert.throws(() => checkQualityCases(engines.map(({name}) => ({name})), fakeRun), /cwd/)
})

test('the CLI adapter expands argv and rejects a missing report instead of reusing one', () => {
  const directory = mkdtempSync(join(tmpdir(), 'quality-adapter-test-'))
  try {
    const path = join(directory, 'import.json')
    const engine = {name: 'js', cwd: directory, commands: {import: ['binary', '{mode}', '{report}']}}
    writeFileSync(path, '{}')
    const run = qualityAdapter(directory, (command, args, options) => {
      assert.equal(command, 'binary')
      assert.deepEqual(args, ['safe', path])
      assert.equal(options.cwd, directory)
      assert.equal(options.input, '<p>x</p>')
      assert.equal(existsSync(path), false)
      writeFileSync(path, JSON.stringify({diagnostics: []}))
      return 'x'
    })
    assert.deepEqual(run(engine, 'import', '<p>x</p>', 'safe'), {source: 'x', report: {diagnostics: []}})
    assert.throws(() => qualityAdapter(directory, () => 'x')(engine, 'import', 'input', 'safe'), /ENOENT/)
    assert.throws(() => run(engine, 'fmt', 'input'), /Missing argv/)
    const config = join(directory, 'adapters.json')
    writeFileSync(config, JSON.stringify({engines: []}))
    const child = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/check-quality-cases.mjs', import.meta.url)), config, join(directory, 'out.json')], {encoding: 'utf8'})
    assert.equal(child.status, 1)
    assert.match(child.stderr, /three distinct engine/)
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
})

test('attribute attribution accepts line and column locators', () => {
  const result = checkQualityCases(engines, (engine, action, source, mode) => {
    const output = fakeRun(engine, action, source, mode)
    if (action === 'import') output.report.diagnostics.forEach((row, i) => {
      delete row.path
      row.line = 1
      row.column = i + 1
    })
    return output
  })
  assert.ok(result.results.every((row) => row.failures.length === 0))
})
