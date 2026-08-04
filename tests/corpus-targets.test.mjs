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
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  COMPARISON_TARGETS,
  DEFAULT_TARGET,
  TARGET_EXTENSIONS,
  expectedFileFor,
  fixturelessTargets,
  targetNames,
  targetOf,
} from '../scripts/lib/corpus-targets.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus-optional')
const manifest = JSON.parse(readFileSync(resolve(corpusDir, 'manifest.json'), 'utf8'))

test('a core case may pin a non-HTML target by adding the file', () => {
  // Engine-against-engine agreement is a NECESSARY invariant, not a sufficient
  // one: it cannot tell "all three are right" from "all three are wrong", which
  // is the state PART 10 §10a is in (carve#589). A Tier-1 rule about the
  // Markdown, plain or terminal output needs somewhere to be written down, and
  // that somewhere is a file beside the case, named by the same pairing rule
  // the optional corpus uses.
  //
  // This checks the rule holds for whatever core cases have taken it up: every
  // non-HTML expected file names a case that exists, and no stray extension
  // sneaks in beside the inputs.
  const core = resolve(here, 'corpus')
  const known = new Set(Object.values(TARGET_EXTENSIONS))
  const stray = []
  const orphaned = []
  for (const name of readdirSync(core)) {
    // The directory's own README is prose, not an expectation.
    if (name === 'README.md') continue
    const ext = name.slice(name.lastIndexOf('.') + 1)
    if (ext === 'crv') continue
    if (!known.has(ext)) {
      stray.push(name)
      continue
    }
    const slug = name.slice(0, name.lastIndexOf('.'))
    if (!existsSync(resolve(core, `${slug}.crv`))) orphaned.push(name)
  }
  assert.deepEqual(stray, [], `unknown expected-output extension in tests/corpus: ${stray.join(', ')}`)
  assert.deepEqual(orphaned, [], `expected output with no input beside it: ${orphaned.join(', ')}`)
})

test('a target maps to the extension the corpus README documents', () => {
  assert.deepEqual(TARGET_EXTENSIONS, {
    html: 'html',
    markdown: 'md',
    plain: 'txt',
    ansi: 'ansi',
    carve: 'fmt',
  })
})

test('a target with no expected-output extension is not asked for a filename', () => {
  // The throw is what stops a manifest typo from silently pairing a case with
  // the wrong file. It was `carve` that exercised this: the fixture rule for
  // core cases asked for its filename before it had one, and `compare:impls`
  // died on the first document of every default run with `unknown target
  // 'carve'` - a crash on the happy path, shipped because the run I checked
  // passed --targets=.
  assert.throws(() => expectedFileFor('01-emphasis', 'nonsense'), /unknown target 'nonsense'/)
  assert.equal(TARGET_EXTENSIONS.nonsense, undefined)
})

test('carve pairs with .fmt, which is not a .crv', () => {
  // The canonical writer HAS a fixture home now. It had none while the
  // objection stood that a second home would put two `NN-slug.crv` files in one
  // directory - true of that extension, not of the target. `.fmt` collides with
  // nothing, and every `.crv` walker in the repo still sees only inputs.
  //
  // What the absence cost: `carve: compared=557 diffs=9 fixtures=none`. Nine
  // disagreements with no way to say which engine was wrong.
  assert.equal(TARGET_EXTENSIONS.carve, 'fmt')
  assert.equal(expectedFileFor('01-example', 'carve'), '01-example.fmt')
  assert.ok(!expectedFileFor('01-example', 'carve').endsWith('.crv'))
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

test('every compared target either has a fixture rule or is named as having none', () => {
  // The two lists are NOT interchangeable. `COMPARISON_TARGETS` is what the
  // engines are compared on; `TARGET_EXTENSIONS` is what has an expected file
  // here. Treating one as the other means asking `expectedFileFor` for a name
  // it is designed to refuse, and it refuses by throwing - correctly, because
  // for a manifest entry an unknown target is a typo.
  //
  // carve#590 moved that call ahead of the check that used to shield it, and
  // `unknown target 'carve' for '01-emphasis-10'` killed every compare:impls
  // run, main included, until the nightly conformance job reported it.
  for (const target of targetNames()) {
    assert.ok(
      COMPARISON_TARGETS.includes(target),
      `${target} has an expected-file rule but is never compared`,
    )
  }
  // Every compared target can now carry an expected file. This is reported
  // rather than required: a target added to COMPARISON_TARGETS without an
  // extension is compared engine-against-engine only, which is a weaker check
  // and should be a deliberate choice, not a default nobody noticed.
  assert.deepEqual(fixturelessTargets(), [])
})

test('asking for a fixtureless target\'s filename is still an error', () => {
  // Vacuous while every target has an extension, and kept for the day one does
  // not: the throw must not be softened into an html fallback, which would
  // silently pair a case with the wrong file. Callers that compare a
  // fixtureless target skip the lookup instead.
  for (const target of fixturelessTargets()) {
    assert.throws(() => expectedFileFor('01-example', target), /unknown target/)
  }
})
