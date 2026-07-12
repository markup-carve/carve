/*
 * Optional Tier-2 corpus runner for the vendored reference implementation.
 *
 * Each pair in tests/corpus-optional/ is tagged with a feature id in
 * manifest.json. The reference implementation runs only the features it
 * actually supports; unsupported Tier-2 features stay visible as skipped tests
 * instead of being silently ignored.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  carveToHtml,
  citations,
  codeCallouts,
  details,
  listTable,
  spoiler,
  tabs,
} from '../docs/.vitepress/carve-lib/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus-optional')
const manifestPath = resolve(corpusDir, 'manifest.json')

if (!existsSync(manifestPath)) {
  throw new Error(`Optional Tier-2 corpus manifest not found at ${manifestPath}.`)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const featureRunners = {
  'social-link-templates': (source) =>
    carveToHtml(source, {
      mentionUrl: '/users/{name}',
      tagUrl: '/topics/{name}',
    }),
  'emoji-map': (source) =>
    carveToHtml(source, {
      emoji: {
        rocket: '🚀',
        tada: '🎉',
      },
    }),
  'citations-numbered': (source) => carveToHtml(source, { extensions: [citations()] }),
  'citations-author-date': (source) =>
    carveToHtml(source, { extensions: [citations({ mode: 'author-date' })] }),
  'code-callouts': (source) => carveToHtml(source, { extensions: [codeCallouts()] }),
  details: (source) => carveToHtml(source, { extensions: [details()] }),
  'list-table': (source) => carveToHtml(source, { extensions: [listTable()] }),
  spoiler: (source) => carveToHtml(source, { extensions: [spoiler()] }),
  tabs: (source) => carveToHtml(source, { extensions: [tabs()] }),
}

for (const entry of manifest.cases) {
  const slug = basename(entry.slug)
  const crvPath = resolve(corpusDir, `${slug}.crv`)
  const htmlPath = resolve(corpusDir, `${slug}.html`)
  const render = featureRunners[entry.feature]

  if (!render) {
    test.skip(`${slug} (${entry.feature})`, () => {})
    continue
  }

  test(`${slug} (${entry.feature})`, () => {
    assert.ok(existsSync(crvPath), `missing ${slug}.crv pair`)
    assert.ok(existsSync(htmlPath), `missing ${slug}.html pair`)
    const source = readFileSync(crvPath, 'utf8')
    const expected = readFileSync(htmlPath, 'utf8')
    assert.equal(render(source).trim(), expected.trim())
  })
}
