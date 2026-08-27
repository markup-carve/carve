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

import { classify, parseManifest, renderMermaid, releaseLayers, renderReleaseOrder, ciReferences, notARelease } from '../tools/dependency-map.mjs'

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

/*
 * THE RELEASE ORDER, AND THE TWO WAYS IT SILENTLY LIES.
 *
 * Both of these were live defects in the first cut of the renderer, and neither
 * one produces an error - they produce a shorter list, which reads exactly like
 * a smaller org.
 */

const edgesFor = (pairs, field = 'dependencies') =>
  pairs.map(([repo, target]) => ({ repo, target, field, verdict: 'released', note: '' }))

test('a repo that declares no dependency still appears in the order', () => {
  // Seeding the node set from the edges drops every repo that declares nothing.
  // That is the whole unconstrained tail - the editors, the standalone tools -
  // and its absence is invisible: the page just stops mentioning them.
  const { layer } = releaseLayers(edgesFor([['engine', 'carve']]), ['carve', 'engine', 'lonely'])
  assert.equal(layer.get('lonely'), 0, 'a repo with no edge belongs in stage 0')
  assert.equal(layer.get('carve'), 0)
  assert.equal(layer.get('engine'), 1)
})

test('the order covers every repo it was given', () => {
  const repos = ['carve', 'engine', 'binding', 'lonely']
  const { layer } = releaseLayers(edgesFor([['engine', 'carve'], ['binding', 'engine']]), repos)
  assert.deepEqual([...layer.keys()].sort(), [...repos].sort())
})

test('the spec devDependency cycle does not decide the layering', () => {
  // The spec dev-depends on its engines to render its own corpus, and they
  // submodule the spec back. Honouring that direction makes the graph
  // unlayerable and asserts something false - that the spec cannot be tagged
  // before its own consumers.
  const cycle = [
    { repo: 'carve-js', target: 'carve', field: 'submodule', verdict: 'released', note: '' },
    { repo: 'carve', target: 'carve-js', field: 'devDependencies', verdict: 'released', note: '' },
  ]
  const { layer } = releaseLayers(cycle, ['carve', 'carve-js'])
  assert.equal(layer.get('carve'), 0, 'the spec releases first')
  assert.equal(layer.get('carve-js'), 1, 'the engine follows it')
})

test('a cycle the drop rule does not cover still terminates', () => {
  // Two ordinary repos pointing at each other is not a shape the org has, but a
  // renderer that recurses forever on it fails in the least debuggable way.
  const mutual = [
    { repo: 'a', target: 'b', field: 'dependencies', verdict: 'released', note: '' },
    { repo: 'b', target: 'a', field: 'dependencies', verdict: 'released', note: '' },
  ]
  const { layer } = releaseLayers(mutual, ['a', 'b'])
  assert.ok(layer.has('a') && layer.has('b'), 'both nodes are placed rather than hanging')
})

test('the rendered order names every repo exactly once', () => {
  const repos = ['carve', 'carve-js', 'carve-php', 'binding', 'lonely']
  const states = new Map(repos.map((r) => [r, { latestRelease: '0.1.0', latestTag: '0.1.0', behindTag: 3 }]))
  const text = renderReleaseOrder(
    edgesFor([['carve-js', 'carve'], ['carve-php', 'carve'], ['binding', 'carve-js']]),
    states,
    repos,
  )
  for (const repo of repos) {
    const hits = text.split('\n').filter((line) => line.includes(repo.padEnd(24))).length
    assert.equal(hits, 1, `${repo} should be listed once, found ${hits}`)
  }
  // The tail is split by whether CI names anything, so either heading is the
  // tail being present. Asserting the old single heading would fail on a
  // rename that lost nothing, and pass on one that dropped a whole half.
  assert.match(text, /NOTHING (DECLARED, BUT CI NAMES ONE|FOUND EITHER WAY)/, 'the unconstrained tail has its own heading')
})

/*
 * DEPENDENCIES READ OUT OF CI, AND THE TWO WAYS THAT GOES WRONG.
 *
 * The pattern is looking for `markup-carve/<name>` in a workflow, and that
 * prefix appears in more than repository URLs. Both directions are asserted:
 * a real checkout has to be found, and a lookalike has to be rejected.
 */

const KNOWN = new Set(['carve', 'carve-rs', 'tree-sitter-carve', 'carve-go'])

test('a workflow checkout of another org repo is found', () => {
  const yaml = [
    'jobs:',
    '  drift:',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '        with:',
    '          repository: markup-carve/tree-sitter-carve',
  ].join('\n')
  assert.deepEqual([...ciReferences(yaml, 'helix-carve', KNOWN)], ['tree-sitter-carve'])
})

test('an org-prefixed string that is not a repo is rejected', () => {
  // Live defect: carve-wasm's preflight explains the npm registry path
  // `/-/org/markup-carve/package` in a comment, and a shape-only pattern
  // reported a repository named `package` - with a verdict, in a table whose
  // whole value is that its rows are real.
  const yaml = '# /-/org/markup-carve/package, an ORGANIZATION READ - not a package'
  assert.deepEqual([...ciReferences(yaml, 'carve-wasm', KNOWN)], [])
})

test('a repo does not depend on itself through its own CI', () => {
  const yaml = 'repository: markup-carve/carve-go\nrepository: markup-carve/carve-rs'
  assert.deepEqual([...ciReferences(yaml, 'carve-go', KNOWN)], ['carve-rs'])
})

test('a CI edge never decides a release stage', () => {
  // Coupling is not containment. A workflow checkout says the two are TESTED
  // together, which is worth showing and must not reorder a release.
  const edges = [
    { repo: 'helix-carve', target: 'tree-sitter-carve', kind: 'ci', field: 'workflow' },
    { repo: 'tree-sitter-carve', target: 'carve-js', field: 'dependencies' },
  ]
  const { layer, soft } = releaseLayers(edges, ['helix-carve', 'tree-sitter-carve', 'carve-js'])
  assert.equal(layer.get('helix-carve'), 0, 'the CI edge leaves it unconstrained')
  assert.equal(layer.get('tree-sitter-carve'), 1, 'the declared edge still layers')
  assert.deepEqual([...(soft.get('helix-carve') ?? [])], ['tree-sitter-carve'])
})

test('a repo that is not a release artifact is named, not silently dropped', () => {
  for (const repo of ['.github', 'awesome-carve', 'carve-bench', 'laravel-carve-demo']) {
    assert.equal(notARelease(repo), true, `${repo} is not a release artifact`)
  }
  for (const repo of ['carve', 'carve-js', 'wp-carve']) {
    assert.equal(notARelease(repo), false, `${repo} is one`)
  }
  const repos = ['carve', 'carve-js', 'awesome-carve', 'laravel-carve-demo']
  const states = new Map(repos.map((r) => [r, { latestRelease: '0.1.0', latestTag: '0.1.0', behindTag: 1 }]))
  const text = renderReleaseOrder([{ repo: 'carve-js', target: 'carve', field: 'dependencies' }], states, repos)
  assert.match(text, /NOT A RELEASE ARTIFACT/)
  assert.match(text, /awesome-carve/, 'named in the excluded list rather than omitted')
  assert.match(text, /laravel-carve-demo/)
})

test('an excluded repo cannot appear as a release stage member', () => {
  const repos = ['carve', 'carve-js', 'laravel-carve', 'laravel-carve-demo']
  const states = new Map(repos.map((r) => [r, { latestRelease: '0.1.0', latestTag: '0.1.0', behindTag: 0 }]))
  const text = renderReleaseOrder(
    [
      { repo: 'carve-js', target: 'carve', field: 'dependencies' },
      { repo: 'laravel-carve', target: 'carve-js', field: 'dependencies' },
      { repo: 'laravel-carve-demo', target: 'laravel-carve', field: 'dependencies' },
    ],
    states,
    repos,
  )
  const staged = text.split('NOT A RELEASE ARTIFACT')[0]
  assert.ok(!staged.includes('laravel-carve-demo'), 'the demo is not a stage member')
  assert.match(staged, /laravel-carve /, 'the thing it depends on still is')
})
