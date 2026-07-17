/*
 * Spec-corpus conformance test.
 *
 * Pairs every tests/corpus/NN-slug.crv with its NN-slug.html, feeds the
 * .crv through the vendored reference implementation
 * (docs/.vitepress/carve-lib), and asserts a byte-identical match
 * against the .html (after trimming).
 *
 * The corpus is generated from docs/examples/{core,extensions,edge-cases}.md
 * by `npm run corpus:build`; CI regenerates it first, so a mismatch here
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

test('mentions and tags render as non-link spans by default', () => {
  assert.equal(
    carveToHtml('Hey @alice, see #release-1.0.').trim(),
    '<p>Hey <span class="mention"><strong>@alice</strong></span>, see <span class="tag"><strong>#release-1.0</strong></span>.</p>',
  )
})

test('mentions and tags render as links when URL templates are configured', () => {
  assert.equal(
    carveToHtml('Hey @alice, see #release-1.0.', {
      mentionUrl: 'https://github.com/{user}',
      tagUrl: '/topics/{name}',
    }).trim(),
    '<p>Hey <a class="mention" href="https://github.com/alice">@alice</a>, see <a class="tag" href="/topics/release-1.0">#release-1.0</a>.</p>',
  )
})

test('mention and tag URL templates replace every placeholder occurrence', () => {
  assert.equal(
    carveToHtml('Hey @john.doe, see #release-1.0.', {
      mentionUrl: '/users/{user}?q={user}',
      tagUrl: '/topics/{name}?tag={name}',
    }).trim(),
    '<p>Hey <a class="mention" href="/users/john.doe?q=john.doe">@john.doe</a>, see <a class="tag" href="/topics/release-1.0?tag=release-1.0">#release-1.0</a>.</p>',
  )
})
