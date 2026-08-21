/*
 * PART 9 §16a's `labels` map, checked rather than asserted (carve#1508).
 *
 * WHY THIS EXISTS. No fixture in this repo renders with a non-default `labels`
 * map. The core corpus runs at default options, and `featureRunners` in
 * tests/optional-corpus.test.mjs carries `symbol-map`, `social-link-templates`
 * and the typography switches but nothing for `labels`. So every key was
 * verified at its English default only, and an engine that hard-coded all
 * thirteen strings would have passed every check this repo runs - the
 * cannot-fail shape carve#755 catalogs.
 *
 * WHY NOT A CORPUS CASE. A corpus feature has to be reachable from each
 * engine's adapter in scripts/compare-impls.mjs, and no engine CLI takes a
 * labels map today; the case would land as three declared skips, which is the
 * silence tests/optional-feature-adapters.test.mjs exists to prevent. A claims
 * test reaches the library directly and pins every key now, and says nothing
 * about the other two engines - which is honest, where a skip is not.
 *
 * WHAT IT READS. The key names come off the two places the spec states them:
 * PART 9 §16a's list in resources/grammar.ebnf for the ten core writes, and
 * Extensions §1.5's table in docs/extensions.md for the extension-written
 * three. Reading them rather than restating them is the point - a key added to
 * one table with no probe below fails, and a probe for a key neither table
 * names fails too, so the tables and the map cannot drift apart in either
 * direction.
 *
 * BOTH HALVES OF EACH ROW. The default column is checked at default options and
 * the key is checked with a sentinel. Only the sentinel can catch a hard-coded
 * string, and only the default can catch a key whose documented English is
 * wrong; a row is worth nothing without both.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml, codeGroup, index, tabs } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')
const extensions = readFileSync(resolve(root, 'docs/extensions.md'), 'utf8')

/*
 * §16a's list is a fixed-column block: the key, then its default in double
 * quotes, then prose that wraps across rows and carries no key of its own. The
 * block ends at the first blank line, so a row is only read while the block is
 * open - matching `key "default"` document-wide would pick up every quoted
 * example in 7000 lines of grammar.
 */
function coreKeys() {
  const start = grammar.indexOf('   THE KEYS CORE DEFINES,')
  assert.notEqual(start, -1, 'PART 9 §16a no longer opens its key list with THE KEYS CORE DEFINES')
  const body = grammar.slice(start).split('\n').slice(1)
  const rows = new Map()
  for (const line of body) {
    if (rows.size > 0 && line.trim() === '') break
    const m = /^\s{5}([a-zA-Z][A-Za-z0-9]*)\s+"([^"]*)"/.exec(line)
    if (m) rows.set(m[1], m[2])
  }
  return rows
}

/*
 * §1.5's table is a Markdown table whose cells are inline code. It is located
 * by its header rather than by position, for the same reason as above.
 */
function extensionKeys() {
  const start = extensions.indexOf('| Key | Default | Written by |')
  assert.notEqual(start, -1, 'Extensions §1.5 no longer carries a Key/Default table')
  const rows = new Map()
  for (const line of extensions.slice(start).split('\n').slice(2)) {
    const m = /^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/.exec(line)
    if (!m) break
    rows.set(m[1], m[2])
  }
  return rows
}

const documented = new Map([...coreKeys(), ...extensionKeys()])

/*
 * One probe per key: a document that makes the engine write that string, plus
 * whatever registration the string needs. `find` pulls the run the key governs
 * out of the rendered HTML, so a sentinel that lands on some OTHER element is
 * not mistaken for the key working.
 */
const admonition = (kind) => ({
  source: `::: ${kind}\nbody\n:::\n`,
  options: {},
  find: (html) => /<aside class="admonition [a-z]+" aria-label="([^"]*)"/.exec(html)?.[1],
})

const FOOTNOTE = 'Text[^a]\n\n[^a]: A note.\n'

const probes = {
  footnoteBacklink: {
    source: FOOTNOTE,
    options: {},
    find: (html) => /role="doc-backlink" aria-label="([^"]*)"/.exec(html)?.[1],
  },
  endnotes: {
    source: FOOTNOTE,
    options: {},
    find: (html) => /role="doc-endnotes" aria-label="([^"]*)"/.exec(html)?.[1],
  },
  admonitionNote: admonition('note'),
  admonitionTip: admonition('tip'),
  admonitionWarning: admonition('warning'),
  admonitionDanger: admonition('danger'),
  admonitionInfo: admonition('info'),
  admonitionSuccess: admonition('success'),
  admonitionExample: admonition('example'),
  admonitionQuote: admonition('quote'),
  indexBackref: {
    source: 'A :index[gadget] word.\n\n::: index\n:::\n',
    options: { extensions: [index()] },
    find: (html) => /class="index-backref" aria-label="([^"]*)"/.exec(html)?.[1],
  },
  tabsGroup: {
    source: ':::: tabs\n::: tab [First]\nContent one.\n:::\n::::\n',
    options: { extensions: [tabs()] },
    find: (html) => /<div class="tabs" role="group" aria-label="([^"]*)"/.exec(html)?.[1],
  },
  codeGroup: {
    source: '::: code-group\n``` js [Node]\nconsole.log(1)\n```\n:::\n',
    options: { extensions: [codeGroup()] },
    find: (html) => /<div class="code-group" role="group" aria-label="([^"]*)"/.exec(html)?.[1],
  },
}

test('the two tables and the probes name the same keys', () => {
  assert.deepEqual(
    Object.keys(probes).sort(),
    [...documented.keys()].sort(),
    'a key documented in PART 9 §16a or Extensions §1.5 with no probe here is a key ' +
      'nothing verifies, and a probe for a key neither table names is a key nothing states.',
  )
})

/*
 * Liveness, because every assertion below is keyed off `documented`: a parser
 * that matched nothing would leave this file reporting a clean run over zero
 * keys, which is the failure this whole file is about.
 */
test('both tables were actually read', () => {
  assert.equal(coreKeys().size, 10, 'PART 9 §16a states ten core keys')
  assert.equal(extensionKeys().size, 3, 'Extensions §1.5 states three extension keys')
})

for (const [key, documentedDefault] of documented) {
  const probe = probes[key]
  if (!probe) continue

  test(`${key} renders its documented default`, () => {
    const found = probe.find(carveToHtml(probe.source, probe.options))
    assert.ok(found !== undefined, `${key}: the probe found no ${key} string in the output`)
    assert.ok(
      found.includes(documentedDefault),
      `${key}: documented default "${documentedDefault}", rendered "${found}"`,
    )
  })

  test(`${key} takes its value from the labels map`, () => {
    const sentinel = `Sentinel${key}Value`
    const found = probe.find(
      carveToHtml(probe.source, { ...probe.options, labels: { [key]: sentinel } }),
    )
    assert.ok(
      found !== undefined && found.includes(sentinel),
      `${key}: the labels map did not reach the output - rendered "${found}". ` +
        'A key the map cannot change is a string the host cannot translate ' +
        '(PART 9 §16a, Extensions §1.5).',
    )
  })
}

/*
 * The control on the instrument. Without it a renderer that echoed ANY caller
 * string into every name would pass every assertion above, and so would a
 * `find` that returned the sentinel because it read the wrong element.
 */
test('a key the map does not define changes nothing', () => {
  const plain = carveToHtml(probes.admonitionNote.source)
  const withBogus = carveToHtml(probes.admonitionNote.source, {
    labels: { admonitionNotUsed: 'SentinelUnusedValue' },
  })
  assert.equal(withBogus, plain)
})
