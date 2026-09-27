#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkQualityCases, validateEngines } from './lib/quality-check.mjs'
import { comparisonRevisions } from './lib/comparison-revisions.mjs'
import { fileURLToPath } from 'node:url'
import { qualityAdapter } from './lib/quality-adapter.mjs'

const [configPath, outputPath] = process.argv.slice(2)
if (!configPath || !outputPath) throw new Error('Usage: check-quality-cases.mjs adapters.json report.json')
const { engines } = JSON.parse(readFileSync(configPath, 'utf8'))
validateEngines(engines)
const directory = mkdtempSync(join(tmpdir(), 'carve-quality-'))
try {
  const run = qualityAdapter(directory)
  const checked = checkQualityCases(engines, run)
  const revisions = comparisonRevisions(fileURLToPath(new URL('..', import.meta.url)), engines)
  writeFileSync(outputPath, JSON.stringify({revisions, ...checked}, null, 2) + '\n')
  const failed = checked.results.filter((row) => row.failures.length).length
  console.log(JSON.stringify({cases: checked.results.length, failed, crossEngine: checked.crossEngine.length, crossDiagnostics: checked.crossDiagnostics.length}))
  if (failed || checked.crossEngine.length || checked.crossDiagnostics.length) process.exitCode = 1
} finally {
  rmSync(directory, {recursive: true, force: true})
}
