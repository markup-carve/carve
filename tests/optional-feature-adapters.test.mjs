/*
 * Every optional feature is named in the comparison harness.
 *
 * `scripts/compare-impls.mjs` decides per engine, per feature and per target
 * how to invoke that engine. When it has no answer it returns `null`, the case
 * is reported as skipped, and a skip is indistinguishable from coverage unless
 * somebody reads the run.
 *
 * That is how the plain-text and ANSI halves of carve#560 stayed invisible: the
 * carve-php adapter returned `null` for every target other than HTML, so a
 * case pinning either of them had nothing to compare against, and the silence
 * read as "nothing to see". The engines had the option; the harness could not
 * reach it.
 *
 * So a feature has to be reachable from EACH engine's adapter - through its own
 * branches or through a shared table it consults - or be declared unreachable
 * from that engine, with the reason. Any of those is an answer. Absence is not.
 *
 * Per engine, not per file: the first version of this checked only that the
 * name appeared SOMEWHERE in the harness, and removing the whole carve-php half
 * of this ticket left it green, because the same names were still sitting in
 * the table carve-rs reads.
 *
 * This reads the harness rather than running it: it can say somebody wrote an
 * adapter, not that the adapter is right. Whether it is right is what the run
 * itself reports, and the run needs three engine checkouts this test does not.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(resolve(root, 'tests/corpus-optional/manifest.json'), 'utf8'))
const harness = readFileSync(resolve(root, 'scripts/compare-impls.mjs'), 'utf8')
const runner = readFileSync(resolve(root, 'tests/optional-corpus.test.mjs'), 'utf8')

const features = [...new Set(manifest.cases.map((c) => c.feature))].sort()

test('the manifest declares at least one feature per target it pins', () => {
  // Liveness: with an empty or unparsed manifest every assertion below holds
  // vacuously, which is the failure mode this whole file is about.
  assert.ok(features.length > 5, `only ${features.length} optional features found`)
  const targets = [...new Set(manifest.cases.map((c) => c.target ?? 'html'))].sort()
  assert.deepEqual(targets, ['ansi', 'html', 'markdown', 'plain'])
})

/*
 * What one engine's adapter can reach: the names written in its own branches,
 * plus the keys of every shared table it consults. Which tables those are is
 * read off the adapter rather than listed here, so a new table needs no edit -
 * only a table nobody references drops out, which is the right answer.
 *
 * A per-engine set rather than "named anywhere in the file": the two are
 * different, and the difference is the defect. `plain-typography-source` named
 * in the table carve-rs reads says nothing about whether carve-js or carve-php
 * can be asked for it.
 */
function tableKeys(name) {
  const m = harness.match(new RegExp(`const ${name} = (\\{|new Set\\(\\[)`))
  if (!m) return []
  // The opening bracket is the LAST character of the match, so an object
  // literal and a `new Set([...])` are located the same way. Searching for the
  // next `{` instead read a Set's keys off whatever object came after it, which
  // made one table's contents depend on its neighbour's.
  const open = m.index + m[0].length - 1
  const openCh = harness[open]
  const closeCh = openCh === '{' ? '}' : ']'
  let depth = 0
  let end = open
  for (let i = open; i < harness.length; i += 1) {
    if (harness[i] === openCh) depth += 1
    else if (harness[i] === closeCh) {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  return [...harness.slice(open, end).matchAll(/'([a-z0-9][a-z0-9-]+)'/g)].map((m) => m[1])
}

function reachableBy(engine, nextEngine) {
  const from = harness.indexOf(`name: '${engine}'`)
  assert.notEqual(from, -1, `the harness no longer has an adapter spelled \`name: '${engine}'\``)
  const to = nextEngine === null ? harness.length : harness.indexOf(`name: '${nextEngine}'`)
  const slice = harness.slice(from, to)
  const own = [...slice.matchAll(/'([a-z0-9][a-z0-9-]+)'/g)].map((m) => m[1])
  const tables = [...new Set([...slice.matchAll(/\b([A-Z][A-Z0-9_]{3,})\b/g)].map((m) => m[1]))]
  return new Set([...own, ...tables.flatMap(tableKeys)])
}

const engines = [
  ['rust', 'js'],
  ['js', 'php'],
  ['php', null],
]

/*
 * Pairs the harness genuinely cannot ask for today, each with the reason, taken
 * from the run docs/implementation-comparison.md publishes rather than from
 * reading the adapters back to themselves:
 *
 *   rust: pass=5/5 ... skipped=28
 *   symbol-map (html): rust, js
 *
 * carve-rs is driven through its CLI, which has flags for the render OPTIONS
 * and none for the Tier-2 extensions, so every extension-shaped feature is out
 * of its reach from here. carve-php's optional adapters go through
 * `CarveConverter::create()`, which the symbol map is not wired into.
 *
 * The list fails in both directions. A pair that is unreachable and not listed
 * is a silent skip; a pair that is listed and has BECOME reachable is a stale
 * excuse, and the case it covers would go on being reported as unmeasured.
 */
const DECLARED_UNREACHABLE = {
  'rust:bare-url-autolink': 'no CLI flag for the autolink extension',
  'rust:citations-author-date': 'no CLI flag for the citations extension',
  'rust:citations-numbered': 'no CLI flag for the citations extension',
  'rust:code-callouts': 'no CLI flag for the code-callouts extension',
  'rust:details': 'no CLI flag for the details extension',
  'rust:list-table': 'no CLI flag for the list-table extension',
  'rust:semantic-span': 'no CLI flag for the semantic-span extension',
  'rust:spoiler': 'no CLI flag for the spoiler extension',
  'rust:tabs': 'no CLI flag for the tabs extension',
  'php:symbol-map': 'the symbol map is not reachable from CarveConverter::create()',
  // "`section-wrapper-off` and `source-line-after-generated-id` reach carve-js
  // and carve-php" - docs/implementation-comparison.md, on the same run.
  'rust:section-wrapper-off': 'no CLI flag for the sections opt-out',
  'rust:source-line-after-generated-id': 'no CLI flag for the sections opt-out or the line stamp',
}
const reachable = new Map(engines.map(([e, next]) => [e, reachableBy(e, next)]))
const unreachableDeclared = new Set(tableKeys('UNREACHABLE_REASONS'))

for (const feature of features) {
  for (const [engine] of engines) {
    test(`the ${engine} adapter can be asked for '${feature}'`, () => {
      const can = reachable.get(engine).has(feature) || unreachableDeclared.has(feature)
      const declared = DECLARED_UNREACHABLE[`${engine}:${feature}`]
      if (declared) {
        assert.equal(
          can,
          false,
          `'${feature}' is declared unreachable from the ${engine} adapter ("${declared}"), but ` +
            'the adapter now names it. Delete the declaration in the same commit that wired it, ' +
            'or the case goes on reading as unmeasured.',
        )
        return
      }
      assert.ok(
        can,
        `nothing in the ${engine} adapter or in any table it consults names '${feature}', so ` +
          `scripts/compare-impls.mjs returns null for it and the case reports as skipped in ` +
          `that engine. A skip reads as coverage. Write the adapter, declare the feature in ` +
          `UNREACHABLE_REASONS if no engine pair can reach it, or add an entry to ` +
          `DECLARED_UNREACHABLE above with the reason this one engine cannot.`,
      )
    })
  }

  test(`the vendored runner names '${feature}' or declares it unimplemented`, () => {
    assert.ok(
      runner.includes(`'${feature}'`) || runner.includes(`${feature}:`),
      `tests/optional-corpus.test.mjs has no runner for '${feature}', so its expected file is ` +
        'verified by nothing. carve#645 is the same shape: three features had no runner, read ' +
        'as unsupported, and matched their committed fixtures on the first try once one was ' +
        'written.',
    )
  })
}

/*
 * A name somewhere in the file is not the same as a REACHABLE target, which is
 * how the php half of carve#560 hid: the feature was named in the shared tables
 * that carve-js and carve-rs read, and the php adapter bailed out of every
 * target other than HTML before it could ever look.
 *
 * That adapter is the only one with a blanket bailout - the other two derive
 * their command from the target - so this checks the bailout specifically:
 * every target the manifest pins has to be handled BEFORE it. Textual, and
 * narrow enough to be exact about what it reads.
 */
test('the php adapter handles every pinned target before its html-only bailout', () => {
  const slice = harness.slice(harness.indexOf("name: 'php'"))
  assert.ok(slice.length > 0, "the php adapter is no longer spelled `name: 'php'`")
  const bailout = slice.indexOf("if (target !== 'html') return null")
  assert.notEqual(bailout, -1, 'the php adapter no longer bails out of non-html targets')
  const before = slice.slice(0, bailout)

  const pinned = [...new Set(manifest.cases.map((c) => c.target ?? 'html'))].filter(
    (t) => t !== 'html',
  )
  assert.ok(pinned.length > 0, 'no non-html target is pinned by any optional case')

  for (const target of pinned) {
    assert.ok(
      before.includes(`target === '${target}'`),
      `the php adapter reaches its \`target !== 'html'\` bailout without ever handling ` +
        `'${target}', which the optional corpus pins. Every case on that target compares ` +
        'nothing in php, and reports as skipped - the state carve#560 recorded.',
    )
  }
})
