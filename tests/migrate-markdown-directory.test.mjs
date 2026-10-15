import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const script = resolve(dirname(fileURLToPath(import.meta.url)), '../tools/migrate-markdown-directory.mjs')

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'carve-migrate-folder-'))
  const input = join(root, 'input')
  const output = join(root, 'output')
  mkdirSync(join(input, 'chapters'), { recursive: true })
  writeFileSync(join(input, 'chapters', 'links.md'), '[link](https://example.com)\n')
  writeFileSync(join(input, 'chapters', 'extra.markdown'), 'Extra chapter.\n')
  writeFileSync(join(input, 'chapters', 'logo.svg'), '<svg/>\n')
  writeFileSync(join(input, 'raw.md'), '<aside>Note</aside>\n')
  const converter = join(root, 'fake-carve.mjs')
  writeFileSync(converter, `#!/usr/bin/env node
import { readFileSync } from 'node:fs'
const source = readFileSync(process.argv.at(-1), 'utf8')
process.stdout.write(source)
process.stderr.write(JSON.stringify({ schemaVersion: 2, sourceFormat: 'markdown', diagnostics: [
  { code: source.includes('<aside>') ? 'raw-preserved' : 'link-preserved', fidelity: source.includes('<aside>') ? 'degraded' : 'preserved', confidence: 'exact', severity: 'info', message: 'fixture' },
] }))
`)
  chmodSync(converter, 0o755)
  test.after(() => rmSync(root, { recursive: true, force: true }))
  return { root, input, output, converter }
}

test('keeps the folder layout and reports every file needing review', () => {
  const scene = fixture()
  const result = spawnSync(process.execPath, [script, scene.input, scene.output, '--carve-node', scene.converter], { encoding: 'utf8' })
  assert.equal(result.status, 2, result.stderr)
  assert.equal(readFileSync(join(scene.output, 'chapters', 'links.crv'), 'utf8'), '[link](https://example.com)\n')
  assert.equal(readFileSync(join(scene.output, 'chapters', 'extra.crv'), 'utf8'), 'Extra chapter.\n')
  assert.equal(readFileSync(join(scene.output, 'chapters', 'logo.svg'), 'utf8'), '<svg/>\n')
  assert.equal(readFileSync(join(scene.output, 'raw.crv'), 'utf8'), '<aside>Note</aside>\n')
  const report = JSON.parse(readFileSync(join(scene.output, 'migration-report.json'), 'utf8'))
  assert.deepEqual(report.review, ['raw.md'])
  assert.deepEqual(report.files.map((file) => file.source), ['chapters/extra.markdown', 'chapters/links.md', 'raw.md'])
  assert.deepEqual(report.assets, ['chapters/logo.svg'])
  assert.deepEqual(report.skipped, [])
  if (process.platform !== 'win32') {
    const sibling = join(scene.root, 'expected-mode')
    mkdirSync(sibling)
    assert.equal(statSync(scene.output).mode & 0o777, statSync(sibling).mode & 0o777)
  }
})

test('converter failure leaves no partial output directory', () => {
  const scene = fixture()
  writeFileSync(scene.converter, '#!/usr/bin/env node\nprocess.exit(7)\n')
  const result = spawnSync(process.execPath, [script, scene.input, scene.output, '--carve-node', scene.converter], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.equal(existsSync(scene.output), false)
})

test('an existing output directory is never overwritten', () => {
  const scene = fixture()
  mkdirSync(scene.output)
  writeFileSync(join(scene.output, 'keep.txt'), 'keep')
  const result = spawnSync(process.execPath, [script, scene.input, scene.output, '--carve-node', scene.converter], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.equal(readFileSync(join(scene.output, 'keep.txt'), 'utf8'), 'keep')
})

test('case-insensitive output collisions stop the migration', () => {
  const scene = fixture()
  writeFileSync(join(scene.input, 'Guide.md'), 'One\n')
  writeFileSync(join(scene.input, 'guide.MD'), 'Two\n')
  if (readdirSync(scene.input).filter((name) => name.toLowerCase() === 'guide.md').length === 1) {
    writeFileSync(join(scene.input, 'Guide.markdown'), 'Three\n')
  }
  const result = spawnSync(process.execPath, [script, scene.input, scene.output, '--carve-node', scene.converter], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /same output path/)
  assert.equal(existsSync(scene.output), false)
})

test('a source report file cannot be overwritten by the generated report', () => {
  const scene = fixture()
  writeFileSync(join(scene.input, 'migration-report.json'), '{"source":true}\n')
  const result = spawnSync(process.execPath, [script, scene.input, scene.output, '--carve-node', scene.converter], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /same output path/)
  assert.equal(existsSync(scene.output), false)
})
