#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phpDir, rustBinary } from './lib/engine-locations.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const js = resolve(process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js'), 'dist/cli.js')
const php = resolve(phpDir(), 'bin/carve')
const rust = rustBinary()
if (![js, php, rust].every(path => path && existsSync(path))) {
  console.error('migration evidence: missing engine executable', { js, php, rust })
  process.exit(2)
}
const engines = { js: [process.execPath, js], rust: [rust], php: ['php', php] }
const validateReport = new Ajv2020({ strict: true }).compile(JSON.parse(readFileSync(resolve(root, 'resources/migration-report-schema.json'), 'utf8')))
const cases = [
  ['', true], ['hello', true], ['hello world', true], ['café 世界 123', true],
  ['hello\n', true], ['hello\r\n', true], ['hello\r', true],
  ['hello!', false], [' hello', false], ['hello ', false], ['hello  world', false],
  ['hello\nworld', false], ['hello\tworld', false], ['hello\u00a0world', false],
  ['e\u0301', false], ['*markup*', false],
  ['𝐀 ٣ Ⅻ ½', true], ['hello\n\n', true], ['hello\r\n\r\n', true],
  ['\n', true], ['hello\rworld', false], ['hello\r\nworld', false],
]
let checked = 0
for (const [engine, [command, ...prefix]] of Object.entries(engines)) {
  for (const format of ['djot', 'bbcode']) {
    for (const [source, verified] of cases) {
      const result = spawnSync(command, [...prefix, 'migrate', '--from', format, '--report', '-', '--check-loss'],
        { input: source, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 })
      const context = `${engine}/${format}/${JSON.stringify(source)}`
      if (result.error) throw new Error(`${context}: ${result.error.message}`)
      assert.equal(result.signal, null, context)
      assert.equal(result.status, verified ? 0 : 1, `${context}: ${result.stderr}`)
      let report
      try { report = JSON.parse(result.stderr) }
      catch (error) { throw new Error(`${context}: invalid report JSON: ${error.message}`) }
      assert.ok(validateReport(report), `${context}: ${JSON.stringify(validateReport.errors)}`)
      assert.equal(report.sourceFormat, format, context)
      const diagnostics = report.diagnostics.map(({ code, severity, fidelity, confidence }) => ({ code, severity, fidelity, confidence }))
      assert.deepEqual(diagnostics, verified
        ? [{ code: 'literal-text-verified', severity: 'info', fidelity: 'preserved', confidence: 'exact' }]
        : [{ code: 'fidelity-unverified', severity: 'warning', fidelity: 'dropped', confidence: 'fallback' }], context)
      if (verified) assert.equal(result.stdout.replace(/\n+$/, ''), source.replace(/\r\n?/g, '\n').replace(/\n+$/, ''), context)
      checked++
    }
  }
}
const inventory = JSON.parse(readFileSync(resolve(root, 'resources/markdown-import-inventory.json'), 'utf8'))
const classes = new Map(inventory.constructs.map(row => [row.code, row]))
const manifest = JSON.parse(readFileSync(resolve(root, 'tests/importer-fidelity/manifest.json'), 'utf8'))
const covered = new Set()
for (const [engine, [command, ...prefix]] of Object.entries(engines)) {
  for (const fixture of manifest.cases.filter(row => row.runner === 'core')) {
    const expected = { ...fixture.expected, ...fixture.expected.engines?.[engine] }
    const result = spawnSync(command, [...prefix, 'migrate', '--from', fixture.sourceFormat, '--report', '-', '--check-loss'],
      { input: fixture.input, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 })
    const context = `${engine}/${fixture.id}`
    assert.ifError(result.error)
    assert.equal(result.signal, null, context)
    assert.equal(result.status, expected.exit, `${context}: ${result.stderr}`)
    const report = JSON.parse(result.stderr)
    assert.ok(validateReport(report), `${context}: ${JSON.stringify(validateReport.errors)}`)
    assert.equal(report.sourceFormat, fixture.sourceFormat, context)
    assert.equal(result.stdout, expected.output, context)
    const diagnostics = report.diagnostics.map(({ code, severity, fidelity, confidence, path }) => ({ code, severity, fidelity, confidence, ...(path ? { path } : {}) }))
    assert.deepEqual(diagnostics, expected.diagnostics, context)
    for (const row of report.diagnostics) {
      assert.ok(row.message.length > 0, context)
      if (row.code === 'structure-unspellable' && fixture.id.includes('ordered-task')) assert.equal(row.message, 'An ordered task item is not spellable as a Carve task item; the checkbox marker was kept as text', context)
      const contract = classes.get(row.code)
      if (!contract) {
        assert.equal(row.code, 'fidelity-unverified', context)
        continue
      }
      assert.equal(row.severity, contract.severity, context)
      assert.equal(row.fidelity, contract.fidelity, context)
      assert.equal(row.confidence, contract.confidence, context)
      if (!diagnostics.some(item => item.code === 'fidelity-unverified')) assert.match(row.path ?? '', /^line:[1-9][0-9]*$/, context)
      covered.add(`${engine}/${row.code}`)
    }
    for (const [profile, html] of Object.entries(fixture.expected.html ?? {})) {
      const rendered = spawnSync(command, [...prefix, ...(profile === 'safe' ? ['--safe'] : [])],
        { input: result.stdout, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 })
      assert.ifError(rendered.error)
      assert.equal(rendered.signal, null, `${context}/${profile}`)
      assert.equal(rendered.status, 0, `${context}/${profile}: ${rendered.stderr}`)
      assert.equal(rendered.stdout, html, `${context}/${profile}: render spelling divergence`)
    }
    checked++
  }
  for (const row of inventory.constructs) assert.ok(covered.has(`${engine}/${row.code}`), `${engine}: no fixture covers ${row.construct}`)
}
console.log(`migration evidence: ${checked} CLI cases across all three engines; no exemptions`)
