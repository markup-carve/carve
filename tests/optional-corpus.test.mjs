/*
 * Optional Tier-2 corpus runner for the vendored reference implementation.
 *
 * Each pair in tests/corpus-optional/ is tagged with a feature id in
 * manifest.json. The reference implementation runs only the features it
 * actually supports; unsupported Tier-2 features stay visible as skipped tests
 * instead of being silently ignored.
 *
 * A case may also name a `target`. It defaults to `html`, which is what every
 * case pinned before carve#360; a case naming another target is paired with an
 * expected file carrying that target's extension and is rendered through that
 * target's entry point.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expectedFileFor, targetOf } from '../scripts/lib/corpus-targets.mjs'
import {
  carveToAnsi,
  carveToHtml,
  carveToMarkdown,
  carveToPlainText,
  citations,
  codeCallouts,
  details,
  listTable,
  spoiler,
  tabs,
} from '@markup-carve/carve'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus-optional')
const manifestPath = resolve(corpusDir, 'manifest.json')

if (!existsSync(manifestPath)) {
  throw new Error(`Optional Tier-2 corpus manifest not found at ${manifestPath}.`)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

/*
 * The extension is part of the pairing rule, not a label: a runner locates the
 * expected file from the slug and the target alone. It is shared with
 * scripts/compare-impls.mjs rather than restated, because a second copy is how
 * that runner came to pair every optional case with a `.html` file.
 */
const targets = {
  html: { render: carveToHtml },
  markdown: { render: carveToMarkdown },
  plain: { render: carveToPlainText },
  ansi: { render: carveToAnsi },
}

/*
 * A feature runner supplies the configuration its feature needs and renders
 * through whichever target the case named, so one entry serves a feature that
 * is pinned on more than one target.
 */
const featureRunners = {
  'social-link-templates': (source, render) =>
    render(source, {
      mentionUrl: '/users/{name}',
      tagUrl: '/topics/{name}',
    }),
  'symbol-map': (source, render) =>
    render(source, {
      symbols: {
        rocket: '🚀',
        tada: '🎉',
        '+1': '👍',
        UPPER: '⬆️',
      },
    }),
  'citations-numbered': (source, render) => render(source, { extensions: [citations()] }),
  'citations-author-date': (source, render) =>
    render(source, { extensions: [citations({ mode: 'author-date' })] }),
  /*
   * The one feature here that is a RENDER OPTION rather than an extension: it
   * takes no extension instance, just the switch. Kept in the same table so an
   * engine without the option shows up as a skipped case rather than silently
   * passing on wrapped output.
   */
  'section-wrapper-off': (source, render) => render(source, { sections: false }),
  'source-line-after-generated-id': (source, render) =>
    render(source, { sections: false, sourceLine: true }),
  'code-callouts': (source, render) => render(source, { extensions: [codeCallouts()] }),
  details: (source, render) => render(source, { extensions: [details()] }),
  'list-table': (source, render) => render(source, { extensions: [listTable()] }),
  spoiler: (source, render) => render(source, { extensions: [spoiler()] }),
  tabs: (source, render) => render(source, { extensions: [tabs()] }),
}

for (const entry of manifest.cases) {
  const slug = basename(entry.slug)
  const targetName = targetOf(entry)
  const target = targets[targetName]

  // An unknown target is a manifest error, not an unsupported feature: silently
  // skipping it would read as "this implementation does not do that yet".
  let expectedFile
  try {
    expectedFile = expectedFileFor(slug, targetName)
  } catch (error) {
    test(`${slug} (${entry.feature})`, () => {
      assert.fail(error.message)
    })
    continue
  }

  const crvPath = resolve(corpusDir, `${slug}.crv`)
  const expectedPath = resolve(corpusDir, expectedFile)
  const runner = featureRunners[entry.feature]

  if (!runner) {
    test.skip(`${slug} (${entry.feature})`, () => {})
    continue
  }

  test(`${slug} (${entry.feature}, ${targetName})`, () => {
    assert.ok(existsSync(crvPath), `missing ${slug}.crv pair`)
    assert.ok(existsSync(expectedPath), `missing ${expectedFile} pair`)
    const source = readFileSync(crvPath, 'utf8')
    const expected = readFileSync(expectedPath, 'utf8')
    assert.equal(runner(source, target.render).trim(), expected.trim())
  })
}
