#!/usr/bin/env node
/*
 * Print the first decision where an engine leaves the spec model
 * (docs/decision-trace.md).
 *
 *   node scripts/trace-diff.mjs <input.crv> [--engine js|php|rs]
 *        [--engine-trace <file.jsonl>] [--context N] [--json]
 *
 * An engine is asked for `carve trace <file>` on stdout. One that has no trace
 * mode yet is reported as such, and the model trace is printed alone.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phpDir, rustBinary } from './lib/engine-locations.mjs'
import { firstDivergence, modelTrace, readJsonLines, toJsonLines } from './spec/decision-trace.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = process.argv.slice(2)
const option = (name) => {
  const at = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (at < 0) return null
  const [flag] = args.splice(at, 1)
  return flag.includes('=') ? flag.slice(flag.indexOf('=') + 1) : args.splice(at, 1)[0]
}
const engine = option('engine')
const engineTraceFile = option('engine-trace')
const context = Number(option('context') ?? 3)
const asJson = args.includes('--json') && args.splice(args.indexOf('--json'), 1)
const input = args[0]

if (!input || args.length > 1 || (engine && !['js', 'php', 'rs'].includes(engine))) {
  console.error('usage: trace-diff.mjs <input> [--engine js|php|rs] [--engine-trace file.jsonl] [--context N] [--json]')
  process.exit(2)
}

const source = readFileSync(input, 'utf8')
const sourceLines = source.split('\n')
const model = modelTrace(source)

function engineCommand(name) {
  if (name === 'js') {
    const dir = process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js')
    const cli = join(dir, 'dist/cli.js')
    return existsSync(cli) ? [process.execPath, cli] : null
  }
  if (name === 'php') {
    const bin = phpDir() && join(phpDir(), 'bin/carve')
    return bin && existsSync(bin) ? ['php', bin] : null
  }
  const bin = rustBinary()
  return bin ? [bin] : null
}

function engineTrace() {
  if (engineTraceFile) return { name: engineTraceFile, ...readJsonLines(readFileSync(engineTraceFile, 'utf8')) }
  if (!engine) return null
  const command = engineCommand(engine)
  if (!command) return { name: `carve-${engine}`, missing: `carve-${engine} is not built where trace-diff looks for it` }
  const run = spawnSync(command[0], [...command.slice(1), 'trace', resolve(input)], { encoding: 'utf8', timeout: 30000 })
  try {
    if (run.status !== 0) throw new Error(run.stderr.trim().split('\n')[0] || `exit ${run.status}`)
    return { name: `carve-${engine}`, ...readJsonLines(run.stdout) }
  } catch (error) {
    return { name: `carve-${engine}`, missing: `carve-${engine} has no trace mode yet (${error.message})` }
  }
}

const show = (record) => (record ? JSON.stringify(record) : '(no record)')
const lineOf = (record) => record?.line ?? null

const other = engineTrace()
if (!other || other.missing) {
  if (other) console.error(`trace-diff: ${other.missing}; printing the model trace only.`)
  process.stdout.write(toJsonLines('spec-model', model))
  process.exit(0)
}

const at = firstDivergence(model, other.records)
if (asJson) {
  console.log(JSON.stringify({ engine: other.name, index: at, model: model[at] ?? null, engine_record: other.records[at] ?? null }))
  process.exit(at < 0 ? 0 : 1)
}
if (at < 0) {
  console.log(`no divergence: ${model.length} records agree (spec model, ${other.name})`)
  process.exit(0)
}
const line = lineOf(model[at]) ?? lineOf(other.records[at])
console.log(`first divergence at record ${at + 1}${line ? `, line ${line}` : ''}`)
for (let i = Math.max(0, at - context); i < at; i++) console.log(`  same      ${show(model[i])}`)
if (line) console.log(`  source    ${JSON.stringify(sourceLines[line - 1])}`)
console.log(`  model     ${show(model[at])}`)
console.log(`  ${other.name.padEnd(9)} ${show(other.records[at])}`)
for (const id of new Set([model[at]?.step, model[at]?.cell, model[at]?.rule].filter(Boolean))) console.log(`  cites     ${id}`)
process.exit(1)
