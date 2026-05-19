/*
 * Spec-corpus conformance test.
 *
 * Pairs every tests/corpus/NN-slug.crv with its NN-slug.html, feeds the
 * .crv through the vendored reference implementation
 * (docs/.vitepress/carve-lib), and asserts a byte-identical match
 * against the .html (after trimming).
 *
 * The corpus is generated from docs/examples.md by
 * `npm run corpus:build`; CI regenerates it first, so a mismatch here
 * means either the examples drifted from the committed corpus or the
 * vendored carve-lib lags carve-js. Both are real regressions.
 *
 * Uses the Node built-in test runner (node:test) so the docs site
 * needs no extra test dependency.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml } from '../docs/.vitepress/carve-lib/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus')

if (!existsSync(corpusDir)) {
  throw new Error(`Spec corpus not found at ${corpusDir}.`)
}

const slugs = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .map((f) => basename(f, '.crv'))
  .sort()

if (slugs.length === 0) {
  throw new Error(
    `No .crv fixtures in ${corpusDir}. Run \`npm run corpus:build\` first.`,
  )
}

for (const slug of slugs) {
  test(slug, () => {
    const crv = readFileSync(resolve(corpusDir, `${slug}.crv`), 'utf8')
    const htmlPath = resolve(corpusDir, `${slug}.html`)
    assert.ok(existsSync(htmlPath), `missing ${slug}.html pair`)
    const expected = readFileSync(htmlPath, 'utf8')
    assert.equal(carveToHtml(crv).trim(), expected.trim())
  })
}
