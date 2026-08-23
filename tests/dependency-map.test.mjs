/*
 * The acceptance table for what counts as a pin on another org repo.
 *
 * The report is only as good as this function, and the failure mode is not a
 * crash - it is a spelling the classifier cannot see, which comes back as "no
 * dependency" and reads exactly like a repo that has none. carve-grammars'
 * publish guard shipped with that hole twice: a prefix filter missed npm's bare
 * `owner/repo#ref` shorthand and never read `optionalDependencies`, and it
 * reported its own manifest clean (markup-carve/carve-grammars#293).
 *
 * So both directions are asserted here. A spelling that IS a pin has to resolve
 * to the right repo and the right ref; a spelling that is NOT has to come back
 * null, and the `npm:` alias row is what keeps the rule from collapsing into
 * "anything with a slash".
 */
import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { classify, parseManifest, renderMermaid } from '../tools/dependency-map.mjs'

const cases = [
  ['github: shorthand', '@markup-carve/carve', 'github:markup-carve/carve-js#3ba8ba32', 'carve-js', '3ba8ba32'],
  ['bare owner/repo shorthand', '@markup-carve/carve', 'markup-carve/carve-js#abc1234', 'carve-js', 'abc1234'],
  ['git+https url', '@markup-carve/carve', 'git+https://github.com/markup-carve/carve-js.git#deadbee', 'carve-js', 'deadbee'],
  ['ssh url', '@markup-carve/carve', 'git@github.com:markup-carve/carve-js.git#feedfac', 'carve-js', 'feedfac'],
  ['url with no ref', '@markup-carve/carve', 'https://github.com/markup-carve/carve-js.git', 'carve-js', null],
  ['registry range', '@markup-carve/carve', '^0.1.4', 'carve-js', '^0.1.4'],
  ['composer name', 'markup-carve/carve-php', '^0.1.5', 'carve-php', '^0.1.5'],
]

for (const [name, dep, spec, target, ref] of cases) {
  test(`classifies ${name}`, () => {
    const found = classify(dep, spec)
    assert.equal(found?.target, target, `target for ${spec}`)
    assert.equal(found?.ref ?? found?.spec ?? null, ref, `ref for ${spec}`)
  })
}

test('an npm: alias is a registry spec, not a repository', () => {
  // `npm:@scope/name@1.2.3` resolves from the registry. Rejecting it as a git
  // spelling would be the over-broad fix that breaks a legitimate manifest.
  const found = classify('carve', 'npm:@markup-carve/carve@0.1.4')
  assert.notEqual(found?.kind, 'git')
})

test('another owner is not an org dependency', () => {
  assert.equal(classify('other', 'github:someone-else/carve-js#abc1234'), null)
})

test('a local path pins nothing', () => {
  assert.equal(classify('@markup-carve/carve', 'file:../carve-js')?.kind, 'path')
})

test('optionalDependencies is read, like every other field', () => {
  const manifest = JSON.stringify({
    optionalDependencies: { '@markup-carve/carve': 'github:markup-carve/carve-js#0badc0de' },
  })
  const edges = parseManifest('npm', 'package.json', manifest)
  assert.equal(edges.length, 1)
  assert.equal(edges[0].target, 'carve-js')
  assert.equal(edges[0].field, 'optionalDependencies')
})

test('a submodule pin is the gitlink, not the url', () => {
  const gitmodules = '[submodule "spec"]\n\tpath = spec\n\turl = https://github.com/markup-carve/carve\n'
  const gitlinks = new Map([['spec', '1234567890abcdef1234567890abcdef12345678']])
  const edges = parseManifest('submodule', '.gitmodules', gitmodules, gitlinks)
  assert.equal(edges.length, 1)
  assert.equal(edges[0].target, 'carve')
  assert.equal(edges[0].ref, '1234567890abcdef1234567890abcdef12345678')
})

test('a Cargo inline table is read as its version, not as the whole table', () => {
  // `{ package = "carve-lang", version = "=0.1.3" }` is a registry pin wearing
  // a rename. Taking the raw value made the table the spec, which reported a
  // released pin as an unresolvable range - and put a quote in a graph label,
  // where it ended the label early and failed the whole diagram to render.
  const cargo = '[dependencies]\ncarve_rs = { package = "carve-lang", version = "=0.1.3" }\n'
  const edges = parseManifest('cargo', 'Cargo.toml', cargo)
  assert.equal(edges.length, 1)
  assert.equal(edges[0].target, 'carve-rs')
  assert.equal(edges[0].spec, '=0.1.3')
})

test('a Cargo git dependency keeps its rev', () => {
  const cargo =
    '[dependencies]\ncarve_rs = { package = "carve-lang", git = "https://github.com/markup-carve/carve-rs", rev = "a33c42ad" }\n'
  const edges = parseManifest('cargo', 'Cargo.toml', cargo)
  assert.equal(edges[0].target, 'carve-rs')
  assert.equal(edges[0].ref, 'a33c42ad')
})


test('a hostile spec cannot break the diagram', () => {
  // A quote inside `|"…"|` ends the label early and Mermaid then fails the
  // WHOLE diagram, not the one edge - which is how a Cargo inline table took
  // the rendered page down with `Parse error on line 57`. Brackets and pipes
  // are node and edge syntax for the same reason, so the label carries none
  // of them.
  const rendered = renderMermaid([
    {
      repo: 'carve-bench',
      target: 'carve-rs',
      spec: '{ package = "carve-lang", version = "=0.1.3" }',
      verdict: 'range',
      resolved: null,
      ref: null,
    },
  ])
  const labels = [...rendered.matchAll(/-->\|"([^"]*)"\|/g)].map((match) => match[1])
  assert.equal(labels.length, 1)
  for (const label of labels) {
    assert.ok(!/["'`|<>{}[\]()]/.test(label), `label carries syntax: ${label}`)
  }
})

test('each node is declared once', () => {
  const edge = (repo, target) => ({ repo, target, spec: '^0.1.4', verdict: 'range', resolved: '^0.1.4', ref: null })
  const rendered = renderMermaid([edge('a-carve', 'carve-js'), edge('b-carve', 'carve-js')])
  const declarations = [...rendered.matchAll(/^\s*carve_js\["carve-js"\]/gm)]
  assert.equal(declarations.length, 1)
})
