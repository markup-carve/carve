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
  for (const format of ['markdown', 'djot', 'bbcode']) {
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
console.log(`migration evidence: ${checked} CLI cases across all three engines; no exemptions`)
