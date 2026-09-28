#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phpDir, rustBinary } from './lib/engine-locations.mjs'
import { corpusFiles, diagnostics, differences, reconcile, lintEngines } from './lib/lint-corpus.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
let commands
function engineCommands() { return {
  js: [process.execPath, resolve(process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js'), 'dist/cli.js')],
  php: ['php', resolve(phpDir(), 'bin/carve')],
  rust: [rustBinary()],
} }
const args = process.argv.slice(2)
if (args.length && (args.length !== 2 || args[0] !== '--report')) throw new Error('usage: lint-corpus-check.mjs [--report file.json]')
function lint(engine, files) {
  const [command, ...prefix] = commands[engine]
  if (!command) throw new Error(`${engine}: build the engine before running lint parity`)
  return diagnostics(spawnSync(command, [...prefix, 'lint', ...files], {
    cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024,
  }), files)
}
const temporary = mkdtempSync(join(tmpdir(), 'carve-lint-columns-'))
try {
  commands = engineCommands()
  const files = corpusFiles(root)
  const results = {}
  for (const engine of lintEngines) {
    results[engine] = {}
    for (let start = 0; start < files.length; start += 100) Object.assign(results[engine], lint(engine, files.slice(start, start + 100)))
    console.log(`${engine}: linted ${files.length} corpus documents`)
  }
  const actual = differences(results, files)
  const failures = reconcile(actual, JSON.parse(readFileSync(resolve(root, 'resources/lint-corpus-drift.json'), 'utf8')))
  const controls = [...new Set([...Object.keys(actual), ...[0, 0.33, 0.66, 1].map(fraction => files[Math.floor(fraction * (files.length - 1))])])]
  for (const file of controls) for (const engine of lintEngines) {
    if (JSON.stringify(lint(engine, [file])[file]) !== JSON.stringify(results[engine][file])) failures.push(`${engine}: batched lint differs from single-file lint: ${file}`)
  }
  console.log(`lint batch isolation: ${controls.length} single-file controls per engine`)
  const probes = ['a', '\u00E9', '\u{1F600}', 'e\u0301']
  for (const prefix of probes) {
    const file = join(temporary, 'column.crv')
    writeFileSync(file, `first line\n${prefix}\u202Eb\n`)
    for (const engine of lintEngines) {
      const expected = ['bidi-control-in-source', 2, [...prefix].length + 1]
      if (!lint(engine, [file])[file].some(item => JSON.stringify(item) === JSON.stringify(expected))) failures.push(`${engine}: Unicode column probe ${JSON.stringify(prefix)} expected ${JSON.stringify(expected)}`)
    }
  }
  const habitRules = {
    js: ['markdown-strong-double-star', 'markdown-strikethrough-double-tilde'],
    php: ['markdown-strong-double-star', 'markdown-strikethrough-double-tilde'],
    rust: ['markdown-strong-double-star', 'markdown-strikethrough-double-tilde'],
  }
  for (const prefix of probes) {
    const file = join(temporary, 'habits.crv')
    writeFileSync(file, `first line\n${prefix} **b** ~~d~~\n`)
    for (const [engine, rules] of Object.entries(habitRules)) {
      const actual = lint(engine, [file])[file]
      const column = [...prefix].length + 2
      for (const [index, rule] of rules.entries()) {
        if (!actual.some(item => JSON.stringify(item) === JSON.stringify([rule, 2, column + index * 6]))) failures.push(`${engine}: Markdown-habit column probe ${JSON.stringify(prefix)} failed for ${rule}`)
      }
    }
  }
  const report = { documents: files.length, differingDocuments: Object.keys(actual).length, differences: actual, failures }
  if (args.length) writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n')
  console.log(`lint corpus: ${files.length} documents, ${Object.keys(actual).length} declared/observed differences; ${probes.length} bidi probes per engine and ${probes.length} Markdown probes per supported engine`)
  for (const failure of failures) console.error(failure)
  process.exitCode = failures.length ? 1 : 0
} catch (error) {
  console.error(`lint corpus could not complete: ${error.message}`)
  process.exitCode = 2
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
