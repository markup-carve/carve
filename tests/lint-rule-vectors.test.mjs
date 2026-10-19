/*
 * Shared lint vectors (tests/lint-rule-vectors/): positives and near-miss
 * negatives that carve-php and carve-rs run through their spec submodule.
 *
 * The vectors are checked for shape here, and run through the pinned carve-js
 * build once that build carries the rule. Before then the rule is declared in
 * lint-rule-table-claims.test.mjs NOT_IN_THE_PIN_YET, whose "arrived" check
 * fails the pin bump that brings it in, so this skip cannot outlive the window.
 * CARVE_JS_DIR points the run at a local carve-js build instead.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'tests/lint-rule-vectors')
const files = readdirSync(dir).filter((name) => name.endsWith('.json'))
const page = readFileSync(resolve(root, 'docs/validation.md'), 'utf8')

const engineDir = process.env.CARVE_JS_DIR
  ? resolve(process.env.CARVE_JS_DIR)
  : resolve(root, 'node_modules/@markup-carve/carve')
const { lintCarve } = await import(pathToFileURL(resolve(engineDir, 'dist/index.js')).href)
const lintSource = readFileSync(resolve(engineDir, 'dist/lint.js'), 'utf8')

test('the vector directory is not empty', () => {
  assert.ok(files.length > 0)
})

for (const file of files) {
  const data = JSON.parse(readFileSync(resolve(dir, file), 'utf8'))

  test(`${file}: shape`, () => {
    assert.equal(data.version, 1)
    assert.equal(file, `${data.rule}.json`)
    assert.ok(page.includes(`| \`${data.rule}\` |`), `${data.rule} has no row in docs/validation.md`)
    const names = data.vectors.map((v) => v.name)
    assert.equal(new Set(names).size, names.length, 'duplicate vector name')
    const positives = data.vectors.filter((v) => v.expected.findings.length > 0)
    assert.ok(positives.length > 0 && positives.length < data.vectors.length,
      'a vector file needs both positives and negatives')
    for (const v of data.vectors) {
      assert.match(v.name, /^[a-z0-9-]+$/)
      assert.equal(typeof v.description, 'string')
      assert.equal(typeof v.source, 'string')
      for (const f of v.expected.findings) {
        assert.deepEqual(Object.keys(f).sort(), ['column', 'line', 'suggests', 'word'])
      }
    }
  })

  const carried = lintSource.includes(`'${data.rule}'`) || lintSource.includes(`"${data.rule}"`)
  test(`${file}: carve-js`, { skip: carried ? false : `${engineDir} does not carry ${data.rule}` }, () => {
    for (const v of data.vectors) {
      const actual = lintCarve(v.source).filter((w) => w.rule === data.rule)
      assert.deepEqual(
        actual.map((w) => [w.line, w.column]),
        v.expected.findings.map((f) => [f.line, f.column]),
        v.name,
      )
      v.expected.findings.forEach((f, i) => {
        assert.ok(actual[i].message.includes(f.word) && actual[i].message.includes(`{${f.suggests}}`),
          `${v.name}: ${actual[i].message}`)
      })
    }
  })
}
