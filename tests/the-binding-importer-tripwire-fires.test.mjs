/*
 * The out-of-scope entries in resources/binding-contract.json are negative
 * claims, and the reader that used to check them could not fail on the case
 * they exist for (markup-carve/carve#2311).
 *
 * It matched ONE pre-guessed identifier per binding per format in ONE pre-named
 * file, so it only ever answered "did the importer ship under exactly the name
 * and in exactly the place somebody typed before it was written". Every other
 * spelling read as absent, which is what an out-of-scope entry claims, so the
 * stale entry stayed green. Both cases below are that failure, and neither is
 * hypothetical: the four bindings already spell the same Djot conversion two
 * ways (`migrateDjot` in carve-wasm, and carve-go's own convention would make
 * it `FromDjot`), and carve-go already ships a second file in the same package.
 *
 * The live check in tests/binding-contract.check-helper.mjs reads GitHub, so it
 * cannot demonstrate a shipped importer without shipping one. These feed the
 * same function a synthetic surface instead.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { exportProbe, isBindingSource, surfaceFindings } from './binding-importer-surface.helper.mjs'

const goDeclaresDjotOutOfScope = {
  importers: { html: 'FromHTML', markdown: 'FromMarkdown' },
  outOfScopeImporters: {
    djot: 'the Go binding does not expose Djot import',
    bbcode: 'the Go binding does not expose BBCode import',
  },
}
const formats = ['html', 'markdown', 'djot', 'bbcode']
const read = (binding, sources) =>
  surfaceFindings({ binding, formats, sources, probe: exportProbe['carve-go'] })

const shippedSurface = (extra) =>
  new Map([
    ['carve.go', 'func FromHTML(source string) {}\nfunc FromMarkdown(source string) {}\n'],
    ...Object.entries(extra),
  ])

test('an importer shipping under an unguessed name trips the out-of-scope entry', () => {
  const findings = read(
    goDeclaresDjotOutOfScope,
    shippedSurface({ 'carve.go': 'func FromHTML(s string) {}\nfunc FromMarkdown(s string) {}\nfunc MigrateDjot(s string) {}\n' }),
  )
  assert.equal(findings.length, 1)
  assert.match(findings[0], /^djot is declared out of scope .* names it at carve\.go:3/)
})

test('an importer shipping in a file beside the one named trips it too', () => {
  const findings = read(
    goDeclaresDjotOutOfScope,
    shippedSurface({ 'imports.go': 'func FromDjot(s string) {}\n' }),
  )
  assert.equal(findings.length, 1)
  assert.match(findings[0], /names it at imports\.go:1/)
})

test('a surface with neither out-of-scope format is silent', () => {
  assert.deepEqual(read(goDeclaresDjotOutOfScope, shippedSurface({})), [])
})

/*
 * The tripwire's own control. A negative claim read against nothing passes, so
 * an empty or wrongly filtered surface would turn every out-of-scope entry
 * green at once - the shape of the eight drift jobs that were all structurally
 * blind. An implemented format whose keyword is absent is therefore a finding.
 */
test('a surface that came back empty fails instead of passing every negative claim', () => {
  const findings = read(goDeclaresDjotOutOfScope, new Map())
  assert.deepEqual(findings.map((line) => line.split(' ')[0]), ['html', 'markdown'])
  assert.match(findings[0], /The surface this read is 0 file\(s\)/)
})

test('a declared importer that is no longer exported is a finding', () => {
  const findings = read(
    goDeclaresDjotOutOfScope,
    new Map([['carve.go', 'func FromHTML(s string) {}\n// Markdown import was withdrawn.\n']]),
  )
  assert.deepEqual(findings.length, 1)
  assert.match(findings[0], /^markdown is declared as `FromMarkdown` but no source file exports that name/)
})

test('a wasm_bindgen name is read whether it is quoted or bare', () => {
  for (const attribute of ['#[wasm_bindgen(js_name = migrateDjot)]', '#[wasm_bindgen(js_name = "migrateDjot")]']) {
    assert.match(attribute, exportProbe['carve-wasm']('migrateDjot'))
  }
})

test('the surface filter keeps a binding source and drops what cannot export one', () => {
  for (const path of ['carve.go', 'src/lib.rs', 'lib/carve.rb', 'carve.pyi', 'ext/carve/src/lib.rs']) {
    assert.ok(isBindingSource(path), path)
  }
  for (const path of [
    'carve_test.go',
    'tests/test_carve.py',
    'test/carve_test.rb',
    'scripts/pinned-spec-commit.py',
    'README.md',
    'carve.gemspec',
  ]) {
    assert.ok(!isBindingSource(path), path)
  }
})
