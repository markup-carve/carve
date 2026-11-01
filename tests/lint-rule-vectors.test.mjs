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
const ahead = JSON.parse(readFileSync(resolve(root, 'resources/lint-vector-ahead-of-pin.json'), 'utf8'))

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
    if (data.rule === 'continuation-marker-refused') {
      assert.deepEqual(Object.keys(ahead).filter((name) => !name.includes('/') && !names.includes(name)), [])
    }
    for (const key of Object.keys(ahead).filter((name) => name.startsWith(`${data.rule}/`))) {
      assert.ok(names.includes(key.slice(data.rule.length + 1)), `${key}: no such vector`)
    }
    assert.equal(new Set(names).size, names.length, 'duplicate vector name')
    const positives = data.vectors.filter((v) => v.expected.findings.length > 0)
    assert.ok(positives.length > 0 && positives.length < data.vectors.length,
      'a vector file needs both positives and negatives')
    for (const v of data.vectors) {
      assert.match(v.name, /^[a-z0-9-]+$/)
      assert.equal(typeof v.description, 'string')
      assert.equal(typeof v.source, 'string')
      for (const f of v.expected.findings) {
        const keys = Object.keys(f).sort()
        if (keys.includes('includes')) {
          assert.deepEqual(keys, ['column', 'includes', 'line'])
          assert.ok(Array.isArray(f.includes) && f.includes.length > 0)
          assert.ok(f.includes.every((part) => typeof part === 'string'))
        } else {
          assert.deepEqual(keys, ['column', 'line', 'suggests', 'word'])
        }
      }
    }
  })

  const carried = lintSource.includes(`'${data.rule}'`) || lintSource.includes(`"${data.rule}"`)
  test(`${file}: carve-js`, { skip: carried ? false : `${engineDir} does not carry ${data.rule}` }, () => {
    for (const v of data.vectors) {
      // An opt-in rule (the #3808 ruling) runs enabled; enabling a default-on rule changes nothing.
      const actual = lintCarve(v.source, data.rule === 'caption-looking-paragraph'
        ? { captionLookingParagraph: true } : { enabledRules: [data.rule] }).filter((w) => w.rule === data.rule)
      // Other rules key their pin-window declarations `<rule>/<vector>`.
      const pinned = data.rule === 'continuation-marker-refused' ? ahead[v.name] : ahead[`${data.rule}/${v.name}`]
      const expected = v.expected.findings.map((f) => [f.line, f.column])
      if (pinned?.actual) assert.notDeepEqual(pinned.actual, expected, `${v.name}: stale pin declaration`)
      assert.deepEqual(
        actual.map((w) => [w.line, w.column]),
        pinned?.actual ?? expected,
        v.name,
      )
      // A `message` declaration names a phrase the pinned build's wording still lacks.
      if (pinned?.message) {
        assert.ok(actual.some((w) => !w.message.includes(pinned.message)), `${v.name}: stale pin declaration`)
      }
      if (pinned) continue
      v.expected.findings.forEach((f, i) => {
        if ('includes' in f) {
          for (const part of f.includes) {
            assert.ok(actual[i].message.includes(part), `${v.name}: ${actual[i].message}`)
          }
        } else {
          assert.ok(actual[i].message.includes(f.word) && actual[i].message.includes(`{${f.suggests}}`),
            `${v.name}: ${actual[i].message}`)
        }
      })
    }
  })
}
