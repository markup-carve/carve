import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { phpDir, rustBinary } from '../scripts/lib/engine-locations.mjs'

const root = resolve(import.meta.dirname, '..')
const { cases } = JSON.parse(readFileSync(new URL('./cli-error-contract/cases.json', import.meta.url), 'utf8'))
const drift = JSON.parse(readFileSync(new URL('../resources/cli-error-drift.json', import.meta.url), 'utf8'))
const jsDir = process.env.CARVE_JS_DIR ?? resolve(root, 'node_modules/@markup-carve/carve')
const commands = {
  js: [process.execPath, resolve(jsDir, 'dist/cli.js')],
  php: ['php', resolve(phpDir(), 'bin/carve')],
  rust: [process.env.CARVE_RS_CLI ?? rustBinary()],
}

assert.ok(!existsSync(resolve(root, '__carve_missing_cli_input_3770__.crv')),
  'the unreadable-input probe requires a missing path')
assert.deepEqual(Object.keys(drift).sort(), Object.keys(commands).sort())
assert.deepEqual(cases.map(row => row.id), ['unknown-option', 'bad-option-value', 'invalid-ast-json', 'unreadable-input'])

for (const [engine, command] of Object.entries(commands)) {
  const binary = engine === 'rust' ? command[0] : command[1]
  const available = Boolean(binary && existsSync(binary))
  if (engine === 'js' || process.env.CARVE_CLI_REQUIRE_ALL === '1') {
    assert.ok(available, `${engine} CLI binary is unavailable`)
  }
  assert.deepEqual(Object.keys(drift[engine]).sort(), cases.map(row => row.id).sort(),
    `${engine} drift inventory must cover every case`)
  for (const row of cases) test(`${engine}: ${row.id}`, { skip: !available }, () => {
    const result = spawnSync(command[0], [...command.slice(1), ...row.args], {
      cwd: root, input: row.stdin, encoding: 'utf8', timeout: 10000,
      maxBuffer: 1024 * 1024,
    })
    if (result.error) throw result.error
    const observed = []
    if (result.status !== 2) observed.push(`status-${result.status}`)
    const firstLine = result.stderr.split(/\r?\n/, 1)[0]
    const category = /^carve\[([^\]]+)\]:/.exec(firstLine)?.[1]
    if (!category) observed.push('category-missing')
    else if (category !== row.category) observed.push(`category-${category}`)
    assert.deepEqual(observed, drift[engine][row.id],
      `${engine}/${row.id}: status ${result.status}; stderr ${JSON.stringify(firstLine)}`)
  })
}
