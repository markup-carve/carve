#!/usr/bin/env node
// Repeatable PART 9 §9 parse-and-render growth probe. CLI times include startup.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { parse } from './spec/layout.mjs'
import { renderDoc } from './spec/html.mjs'
import { phpDir, rustBinary, rustDir } from './lib/engine-locations.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sizes = [2048, 8192, 32768]
const families = {
  'unclosed-combined': n => '/*a\n'.repeat(n),
  'unclosed-braced': n => '{*a\n'.repeat(n),
  'unclosed-bracket': n => '[a\n'.repeat(n),
  'nested-braced': n => '{*a {*b*} c*}\n'.repeat(n),
  'split-combined': n => '~/*a* b~ c*/\n'.repeat(n),
}

const requested = process.argv.slice(2)
if (requested.some(arg => !['--quick', ...Object.keys(families).map(name => `--family=${name}`), '--model-only'].includes(arg))) {
  throw new Error('Usage: npm run bench:inline -- [--quick] [--model-only] [--family=NAME]')
}
const selected = requested.find(arg => arg.startsWith('--family='))?.slice(9)
const counts = requested.includes('--quick') ? [32, 128, 512] : sizes
const modelOnly = requested.includes('--model-only')
const engines = []
const jsDir = process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js')
if (!modelOnly && existsSync(jsDir)) {
  if (!existsSync(join(jsDir, 'dist/cli.js'))) throw new Error(`Build the carve-js checkout first: ${jsDir}`)
  engines.push({ name: 'js', cmd: process.execPath, args: [join(jsDir, 'dist/cli.js'), '--html'], cwd: jsDir })
}
const php = phpDir()
if (!modelOnly && existsSync(php)) {
  if (!existsSync(join(php, 'vendor/autoload.php'))) throw new Error(`Install the carve-php checkout first: ${php}`)
  engines.push({ name: 'php', cmd: 'php', args: [join(php, 'bin/carve'), '--html'], cwd: php })
}
const rs = rustDir()
if (!modelOnly && existsSync(rs)) {
  const binary = rustBinary(rs)
  if (!binary) throw new Error(`Build the carve-rs checkout first: ${rs}`)
  engines.push({ name: 'rs', cmd: binary, args: ['--html'], cwd: rs })
}

function runCli(engine, input) {
  const start = performance.now()
  const result = spawnSync(engine.cmd, engine.args, {
    cwd: engine.cwd, input, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024,
  })
  const ms = performance.now() - start
  if (result.status !== 0) throw new Error(`${engine.name}: ${result.error?.message ?? result.stderr.slice(0, 500)}`)
  return { ms, html: result.stdout.replace(/\n$/, '') }
}

console.log('family\tlines\tbytes\tengine\tms\tmatch')
for (const [name, make] of Object.entries(families)) {
  if (selected && name !== selected) continue
  for (const n of counts) {
    const input = make(n)
    const start = performance.now()
    const expected = renderDoc(parse(input))
    console.log(`${name}\t${n}\t${Buffer.byteLength(input)}\tmodel\t${(performance.now() - start).toFixed(1)}\tself`)
    for (const engine of engines) {
      const { ms, html } = runCli(engine, input)
      const match = html === expected
      console.log(`${name}\t${n}\t${Buffer.byteLength(input)}\t${engine.name}\t${ms.toFixed(1)}\t${match ? 'yes' : 'NO'}`)
      if (!match) throw new Error(`${name} ${n}: ${engine.name} differs from the model`)
    }
  }
}
