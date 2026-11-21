// The changelog gate counts a merge as shipped only when it moves the 0.2
// language surface in spec/0.2/; 0.1 paths and generated views do not count.

import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.CARVE_CHANGELOG_LIB = '1'
const { __internals } = await import('../scripts/changelog-completeness.mjs')
const { isShipped } = __internals

test('the clause documents, data files, curated cases and tree fixtures are shipped', () => {
  for (const path of [
    'spec/0.2/syntax-blocks.md',
    'spec/0.2/includes.md',
    'spec/0.2/data/ast-schema.json',
    'spec/0.2/data/options.json',
    'spec/0.2/conformance/clause-cases.json',
    'spec/0.2/conformance/schema.json',
    'spec/0.2/trees/refused.json',
    'spec/0.2/trees/nodes.json',
  ]) assert.equal(isShipped(path), true, path)
})

test('generated views and the status log are not shipped', () => {
  for (const path of [
    'spec/0.2/conformance/examples.json',
    'spec/0.2/conformance/refused-trees.json',
    'spec/0.2/trees/examples-syntax-inline.json',
    'spec/0.2/STATUS.md',
  ]) assert.equal(isShipped(path), false, path)
})

test('0.1 paths and repository machinery are not shipped', () => {
  for (const path of [
    'resources/spec/blocks.ebnf',
    'resources/examples/heading.crv',
    'resources/ast-schema.json',
    'tests/convert/row.json',
    'scripts/changelog-completeness.mjs',
    'docs/includes.md',
    'CHANGELOG.md',
  ]) assert.equal(isShipped(path), false, path)
})
