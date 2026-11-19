// The docs site serves each schema at the URL its `$id` names: the frozen 0.1
// copies at the site root, the 0.2 schemas under spec/0.2/.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCHEMAS } from '../scripts/publish-schema.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => JSON.parse(readFileSync(resolve(repo, path), 'utf8'))

const LEGACY = [
  'ast-schema.json', 'ast-envelope-schema.json', 'node-roles.json', 'ast-source-layout-schema.json',
  'ast-node-identity-schema.json', 'ast-annotation-range-schema.json', 'ast-provenance-schema.json',
  'html-import-schema.json', 'importer-fidelity-schema.json', 'migration-report-schema.json',
  'render-loss-report.schema.json', 'conversion-diagnostics.schema.json', 'source-patch.schema.json',
  'decision-trace-schema.json',
]

test('the 0.1 schemas stay at the site root, at their own $id', () => {
  for (const name of LEGACY) {
    assert.equal(read(`docs/public/${name}`).$id, `https://markup-carve.github.io/carve/${name}`, name)
  }
  assert.match(read('docs/public/ast-schema.json').description, /Version 0\.1\./)
})

test('each published 0.2 schema declares the path it is served at', () => {
  for (const path of SCHEMAS) {
    assert.equal(read(path).$id, `https://markup-carve.github.io/carve/${path}`, path)
  }
})
