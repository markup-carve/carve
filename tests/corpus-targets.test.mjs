/*
 * The pairing rule that every corpus runner has to share.
 *
 * carve#360 let an optional case pin a target other than HTML. The vendored
 * reference runner learned the rule; scripts/compare-impls.mjs did not, and
 * kept opening `NN-slug.html` for every case - so
 * `npm run compare:impls -- --corpus=optional` died on ENOENT at the first
 * Markdown case. These tests pin the rule itself and pin that every case in the
 * manifest actually has the file the rule names.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_TARGET,
  TARGET_EXTENSIONS,
  expectedFileFor,
  targetNames,
  targetOf,
} from '../scripts/lib/corpus-targets.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus-optional')
const manifest = JSON.parse(readFileSync(resolve(corpusDir, 'manifest.json'), 'utf8'))

test('a target maps to the extension the corpus README documents', () => {
  assert.deepEqual(TARGET_EXTENSIONS, {
    html: 'html',
    markdown: 'md',
    plain: 'txt',
    ansi: 'ansi',
  })
})

test('carve is not an expected-output target', () => {
  // Carve-source expectations live in tests/corpus-roundtrip/. A second home
  // would put two files named `NN-slug.crv` in one directory, one the input.
  assert.equal(TARGET_EXTENSIONS.carve, undefined)
  assert.throws(() => expectedFileFor('01-example', 'carve'), /unknown target 'carve'/)
})

test('an entry without a target pins html', () => {
  assert.equal(targetOf({ slug: '01-example', feature: 'x' }), DEFAULT_TARGET)
  assert.equal(expectedFileFor('01-example'), '01-example.html')
})

test('an entry naming a target pins that target', () => {
  assert.equal(targetOf({ slug: '30-x', feature: 'x', target: 'markdown' }), 'markdown')
  assert.equal(expectedFileFor('30-x', 'markdown'), '30-x.md')
  assert.equal(expectedFileFor('30-x', 'plain'), '30-x.txt')
  assert.equal(expectedFileFor('30-x', 'ansi'), '30-x.ansi')
})

test('an unknown target is an error, not a silent html fallback', () => {
  // A fallback would pair the case with a file that was never written for it
  // and report the resulting mismatch as an engine divergence.
  assert.throws(() => expectedFileFor('30-x', 'pdf'), /unknown target 'pdf'/)
  assert.throws(() => expectedFileFor('30-x', 'pdf'), new RegExp(targetNames().join(', ')))
})

test('every optional case has the input and expected file its target names', () => {
  assert.ok(manifest.cases.length > 0, 'manifest has no cases')
  for (const entry of manifest.cases) {
    const slug = basename(entry.slug)
    const expected = expectedFileFor(slug, targetOf(entry))
    assert.ok(existsSync(resolve(corpusDir, `${slug}.crv`)), `missing ${slug}.crv`)
    assert.ok(existsSync(resolve(corpusDir, expected)), `missing ${expected}`)
  }
})

test('a non-html case does not also carry an html fixture', () => {
  // Pinning this keeps the ENOENT crash from being "fixed" by adding the file
  // the old code looked for: the target is the pairing rule, not a fallback
  // chain, and two fixtures for one case would let the two runners disagree
  // about which one is authoritative.
  for (const entry of manifest.cases) {
    const target = targetOf(entry)
    if (target === DEFAULT_TARGET) continue
    const slug = basename(entry.slug)
    assert.ok(
      !existsSync(resolve(corpusDir, `${slug}.html`)),
      `${slug} pins target '${target}' but also has an html fixture`,
    )
  }
})
