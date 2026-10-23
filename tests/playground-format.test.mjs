// The playground's Format action, against the real carve-js and the vendored WASM build.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToCarve } from '@markup-carve/carve'
import { formatCarve, wasmWriter } from '../docs/.vitepress/playground-format.js'

const here = dirname(fileURLToPath(import.meta.url))
const wasmDir = resolve(here, '../docs/.vitepress/carve-wasm')

const TABLE = '| Name | Qty |\n|:--|--:|\n| apple | 3 |\n| fig | 12 |\n'

async function vendoredWasm() {
  const mod = await import(resolve(wasmDir, 'carve_wasm.js'))
  mod.initSync({ module: readFileSync(resolve(wasmDir, 'carve_wasm_bg.wasm')) })
  return mod
}

test('alignTables pads table columns so the pipes line up', () => {
  const { text } = formatCarve(TABLE, { engine: 'js', alignTables: true, jsFormat: carveToCarve, wasmFormat: null })
  const rows = text.trimEnd().split('\n')
  const pipes = (row) => [...row].flatMap((c, i) => (c === '|' ? [i] : []))
  for (const row of rows) assert.deepEqual(pipes(row), pipes(rows[0]), text)
})

test('without alignTables the writer leaves columns unpadded', () => {
  const aligned = formatCarve(TABLE, { engine: 'js', alignTables: true, jsFormat: carveToCarve, wasmFormat: null }).text
  const plain = formatCarve(TABLE, { engine: 'js', alignTables: false, jsFormat: carveToCarve, wasmFormat: null }).text
  assert.notEqual(plain, aligned)
})

test('Rust mode falls back to carve-js when the vendored build has no writer, and says so', async () => {
  const mod = await vendoredWasm()
  const wasmFormat = wasmWriter(mod)
  const result = formatCarve(TABLE, { engine: 'rust', alignTables: true, jsFormat: carveToCarve, wasmFormat })
  if (wasmFormat === null) {
    assert.equal(result.engine, 'js')
    assert.equal(result.fellBack, true)
  } else {
    assert.equal(result.engine, 'rust')
    assert.equal(result.fellBack, false)
  }
  assert.equal(result.text, carveToCarve(TABLE, { alignTables: true }))
})

test('a writer export is used when the build has one', () => {
  const calls = []
  const wasmFormat = (source, options) => (calls.push(options), 'rs')
  const result = formatCarve(TABLE, { engine: 'rust', alignTables: true, jsFormat: () => 'js', wasmFormat })
  assert.deepEqual(result, { text: 'rs', engine: 'rust', fellBack: false })
  assert.deepEqual(calls, [{ alignTables: true }])
})
