import { readFileSync } from 'node:fs'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { sourceQualityCases, importQualityCases } from './quality-cases.mjs'

const validateReport = new Ajv2020({strict: true}).compile(JSON.parse(readFileSync(new URL('../../resources/migration-report-schema.json', import.meta.url), 'utf8')))
const normalize = (text) => text.replace(/\r\n/g, '\n').trim()
const diagnosticKey = ({code, severity, fidelity, confidence}) => JSON.stringify({code, severity, fidelity, confidence})
const locator = (row) => row.path ?? row.sourceLocation ?? (row.line === undefined ? undefined : {line: row.line, column: row.column})
const diagnosticKeys = (rows) => rows.map(diagnosticKey).filter((key, index, keys) => index === 0 || key !== keys[index - 1])

export function validateEngines(engines) {
  if (!Array.isArray(engines) || engines.length !== 3 || engines.map((e) => e?.name).sort().join(',') !== 'js,php,rust') {
    throw new Error('Exactly three distinct engine adapters named js, php and rust are required')
  }
  if (engines.some((e) => typeof e.cwd !== 'string' || !e.cwd.trim())) throw new Error('Each engine requires a cwd')
}

function expectedDiagnostics(rows, codes) {
  let index = 0
  for (const row of rows) {
    if (!codes.includes(row.code)) return false
    if (row.code === codes[index]) index += 1
  }
  return index === codes.length
}

export function checkQualityCases(engines, run) {
  validateEngines(engines)
  const cases = [...sourceQualityCases(), ...importQualityCases()]
  const results = []
  for (const engine of engines) {
    for (const test of cases) {
      const result = {engine: engine.name, id: test.id, failures: []}
      try {
        let source = test.source
        if (test.mode) {
          const imported = run(engine, 'import', source, test.mode)
          source = imported.source
          result.diagnostics = imported.report
          const report = imported.report
          if (!validateReport(report) || report.sourceFormat !== 'html' || report.mode !== test.mode) {
            result.failures.push('diagnostic-envelope')
          } else {
            result.validDiagnostics = true
            if (!expectedDiagnostics(report.diagnostics, test.expectedCodes)) result.failures.push('diagnostic-expectation')
            if (test.expectedAttributions && new Set(report.diagnostics.filter((row) => row.code === 'attribute-dropped').map((row) => locator(row) == null ? undefined : JSON.stringify(locator(row))).filter(Boolean)).size < test.expectedAttributions) result.failures.push('diagnostic-attribution')
          }
        }
        const html = normalize(run(engine, 'html', source))
        const formatted = run(engine, 'fmt', source)
        result.html = html
        if (test.expectedHtml !== undefined && html !== test.expectedHtml) result.failures.push('import-meaning')
        if (test.payload && !html.includes(`<pre><code>${test.payload}</code></pre>`)) result.failures.push('fence-payload')
        if (normalize(run(engine, 'html', formatted)) !== html) result.failures.push('format-meaning')
        if (run(engine, 'fmt', formatted) !== formatted) result.failures.push('format-idempotence')
        if (normalize(run(engine, 'fromJson', run(engine, 'json', source))) !== html) result.failures.push('json-meaning')
      } catch (error) {
        result.failures.push('adapter-error')
        result.error = String(error)
      }
      results.push(result)
    }
  }
  const crossEngine = []
  const crossDiagnostics = []
  for (const test of cases) {
    const rows = results.filter((row) => row.id === test.id)
    if (rows.some((row) => row.html === undefined) || new Set(rows.map((row) => row.html)).size !== 1) crossEngine.push(test.id)
    if (test.mode) {
      const keys = rows.map((row) => row.validDiagnostics
        ? JSON.stringify(diagnosticKeys(row.diagnostics.diagnostics)) : undefined)
      if (keys.includes(undefined) || new Set(keys).size !== 1) crossDiagnostics.push(test.id)
    }
  }
  return {results, crossEngine, crossDiagnostics}
}
