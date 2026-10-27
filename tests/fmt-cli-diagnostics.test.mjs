import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const engine = resolve(process.env.CARVE_JS_DIR ?? resolve(import.meta.dirname, '../node_modules/@markup-carve/carve'))
const cli = resolve(engine, 'dist/cli.js')
const run = (args, input) => spawnSync(process.execPath, [cli, 'fmt', ...args], {
  input, encoding: 'utf8', timeout: 10000,
})

test('fmt check locates the first change without writing', () => {
  const result = run(['--check'], '# Title   \n')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /^<stdin>:1\n- # Title   \n\+ # Title\n$/)
  assert.equal(result.stdout, '')
})

test('fmt diff writes a unified source patch', () => {
  const result = run(['--diff'], '# Title   \n')
  assert.equal(result.status, 1)
  assert.match(result.stdout, /^--- a\/<stdin>\n\+\+\+ b\/<stdin>\n@@ -1,1 \+1,1 @@\n-# Title   \n\+# Title\n$/)
  assert.equal(result.stderr, '')
})

test('fmt check keeps status zero for canonical input', () => {
  const result = run(['--check'], '# Title\n')
  assert.equal(result.status, 0)
  assert.equal(result.stderr, '')
})
