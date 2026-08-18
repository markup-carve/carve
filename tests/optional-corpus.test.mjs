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
import { miscount, shortfall } from '../scripts/spec/participants.mjs'
import * as lib from '@markup-carve/carve'
import {
  autolink,
  carveToAnsi,
  carveToHtml,
  carveToMarkdown,
  carveToPlainText,
  citations,
  codeCallouts,
  details,
  listTable,
  semanticSpan,
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
  /*
   * Three features that had NO RUNNER and so read as unsupported. The reference
   * engine does all three, and each case matches its committed fixture on the
   * first try - so the skip was describing the harness, not the engine, and
   * three expected files were being verified by nothing (carve#645 is the same
   * shape: a guard whose inputs are a fixed list only guards that list).
   *
   * Locale quote selection is implementation configuration rather than Djot
   * syntax, so the reference engine intentionally does not run that case.
   */
  'bare-url-autolink': (source, render) => render(source, { extensions: [autolink()] }),
  'smart-typography-off': (source, render) => render(source, { smartTypography: false }),
  'markdown-typography-source': (source, render) => render(source, { smartTypography: 'source' }),
  /*
   * The same switch on the two presentation targets. Three feature ids rather
   * than one shared id on three targets, because a manifest entry names one
   * feature and one target, and an engine that carries the mode on Markdown but
   * drops it on plain text has to be able to say so - which is exactly what all
   * three engines used to do (carve#560).
   */
  'plain-typography-source': (source, render) => render(source, { smartTypography: 'source' }),
  /*
   * DEFAULT typography, with no switch at all. It exists so a source-mode case
   * can carry its own control: without one, a case pinning the source spelling
   * also passes an engine that never applies typography to that construct in
   * either mode, which is precisely the failure carve#915 is about.
   */
  'smart-typography-default': (source, render) => render(source),
  'ansi-typography-source': (source, render) => render(source, { smartTypography: 'source' }),
  'code-callouts': (source, render) => render(source, { extensions: [codeCallouts()] }),
  details: (source, render) => render(source, { extensions: [details()] }),
  'list-table': (source, render) => render(source, { extensions: [listTable()] }),
  'list-table-local-headers-1248': (source, render) => render(source, { extensions: [listTable()] }),
  'semantic-span': (source, render) => render(source, { extensions: [semanticSpan()] }),
  spoiler: (source, render) => render(source, { extensions: [spoiler()] }),
  tabs: (source, render) => render(source, { extensions: [tabs()] }),
}

/*
 * Features the reference engine genuinely does not implement, each with the
 * reason. A skip listed here is a statement about the engine; a skip not listed
 * here is a statement about this file, and fails.
 */
const DECLARED_UNIMPLEMENTED = {
  'list-table-columns-1344':
    'markup-carve/carve#1344 column metadata and footer rows have not reached the pinned reference engine yet',
  'smart-quotes-locale-de':
    'locale quote selection is an implementation extension/configuration, not canonical Djot syntax',
}

/*
 * THE RATCHET ON THE EXCUSE, because an entry above can only ever turn a
 * comparison into a skip.
 *
 * `semantic-span` sat here carrying its own expiry condition in a comment -
 * "this stays declared until carve-js registers `semanticSpan`" - and when the
 * pin moved past it, nothing in this file noticed. Both its cases then matched
 * their committed fixtures on the first try, so two comparisons had been
 * reported as intentional skips for as long as the entry outlived its reason,
 * and the only thing standing between the corpus and that state was somebody
 * rereading the comment.
 *
 * The condition is checkable, so it is checked: a feature whose name the
 * reference build now EXPORTS is implemented, whatever this map says. That is
 * the same instrument `tests/extension-catalog-claims.test.mjs` uses on the
 * catalog page, and it is the one that fired on this bump. A feature that is a
 * render option rather than an extension exports nothing and passes - which is
 * correct, since an option's absence is not something an export can report.
 */
test('no unimplemented declaration outlives the engine gaining the feature', () => {
  const asExport = (feature) =>
    feature.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  const exported = new Set(Object.keys(lib))
  const stale = Object.keys(DECLARED_UNIMPLEMENTED)
    .filter((feature) => exported.has(asExport(feature)))
    .sort()
  assert.deepEqual(
    stale,
    [],
    `the reference build now exports ${stale.join(', ')} - give the feature a runner ` +
      'in featureRunners and delete its DECLARED_UNIMPLEMENTED entry.',
  )
})

/*
 * What the loop below actually reached. A runner that generates its cases from
 * a manifest reports a clean run when the manifest is empty, because zero tests
 * pass: measured, `manifest.cases = []` left this file exiting 0 with nothing
 * registered (carve#755, variant 2). `tests/corpus-targets.test.mjs` does floor
 * the manifest at one case, but a partial loss - the eight non-html entries
 * removed, say - passes there and silently deletes eight comparisons here.
 *
 * `compared` is the count that matters, and it is deliberately not
 * `manifest.cases.length`: a case that reached a `continue` above the assertion
 * is a case nobody compared, and the two numbers are how you tell them apart.
 */
let reached = 0
let compared = 0
for (const entry of manifest.cases) {
  reached++
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
    // An undeclared skip is the failure mode this corpus keeps hitting: three
    // features once had no runner, read as unsupported, and matched their
    // committed fixtures on the first try once one was written (carve#645). So
    // a missing runner has to be DECLARED, with the reason, or it is a defect
    // in this file rather than a gap in the engine.
    const reason = DECLARED_UNIMPLEMENTED[entry.feature]
    if (!reason) {
      test(`${slug} (${entry.feature})`, () => {
        assert.fail(
          `no runner for '${entry.feature}' and no entry in DECLARED_UNIMPLEMENTED. ` +
            `Either write the runner, or say why the reference engine cannot do it - ` +
            `an undeclared skip reads as coverage.`,
        )
      })
      continue
    }
    test.skip(`${slug} (${entry.feature}) - ${reason}`, () => {})
    continue
  }

  compared++
  test(`${slug} (${entry.feature}, ${targetName})`, () => {
    assert.ok(existsSync(crvPath), `missing ${slug}.crv pair`)
    assert.ok(existsSync(expectedPath), `missing ${expectedFile} pair`)
    const source = readFileSync(crvPath, 'utf8')
    const expected = readFileSync(expectedPath, 'utf8')
    assert.equal(runner(source, target.render).trim(), expected.trim())
  })
}

test('the run compared the cases the manifest declares', () => {
  // The floor is what a manifest emptied or halved cannot get past. It is well
  // under the count today (38 of 39 cases compare; one is a declared skip), for
  // the same reason the other floors in this repo are: the optional corpus is
  // append-only, so a number below it can only be reached by loss.
  const thin = shortfall({
    label: 'OPTIONAL',
    actual: compared,
    atLeast: 30,
    of: 'case(s)',
    hint: 'tests/corpus-optional/manifest.json is the population; a run over ' +
      'fewer of it registers fewer tests and still exits 0.',
  })
  assert.equal(thin, null, thin ?? '')

  // And the floor cannot see a case the loop reached and dropped, which is the
  // failure a floor alone leaves standing (carve#955's M3). Every entry either
  // compares or is one of the declared skips above.
  const declaredSkips = manifest.cases.filter(
    (e) => !featureRunners[e.feature] && DECLARED_UNIMPLEMENTED[e.feature],
  ).length
  const wrong = miscount({
    label: 'OPTIONAL',
    actual: compared + declaredSkips,
    expected: reached,
    of: 'case(s) compared or declared unimplemented',
  })
  assert.equal(wrong, null, wrong ?? '')
})
