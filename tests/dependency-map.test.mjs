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
import * as nodeFs from 'node:fs'
import * as nodeOs from 'node:os'
import * as nodePath from 'node:path'
import { parseDependencyLedger, auditDependencyLedger } from '../scripts/lib/drift-ledger.mjs'
import { test } from 'node:test'

import { classify, parseManifest, renderMermaid, releaseLayers, renderReleaseOrder, ciReferences, notARelease, vendorProvenance, staleSourceBanner, volatileMask, isSubstantiveChange } from '../tools/dependency-map.mjs'

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

/*
 * A MENTION IS NOT A DEPENDENCY, AND A COMMITTED BUILD IS.
 *
 * Both of these were wrong in a working draft, and both were wrong in the
 * direction that reads as more information rather than less.
 */

test('a workflow that merely names a repo is not depending on it', () => {
  // carve-grammars runs a downstream check that names six consumers. A first
  // cut matched any `markup-carve/x` and reported all six as dependencies of
  // carve-grammars - every arrow backwards, and stated with a verdict.
  const yaml = [
    'jobs:',
    '  downstream:',
    '    strategy:',
    '      matrix:',
    '        consumer: [markup-carve/vim-carve, markup-carve/carve-go]',
    '    steps:',
    '      - run: echo "notify markup-carve/tree-sitter-carve"',
  ].join('\n')
  assert.deepEqual([...ciReferences(yaml, 'carve-grammars', KNOWN)], [])
})

test('a checkout is still found next to mentions', () => {
  const yaml = [
    '      - run: echo markup-carve/carve-go',
    '      - uses: actions/checkout@v4',
    '        with:',
    "          repository: 'markup-carve/carve-rs'",
  ].join('\n')
  assert.deepEqual([...ciReferences(yaml, 'helix-carve', KNOWN)], ['carve-rs'])
})

test('a vendored build names the repo and commit it was built from', () => {
  // intellij-carve ships a 1.4MB carve-js bundle whose header is the only pin
  // that exists for it - no manifest in a JVM project can hold one.
  const head = [
    '// Generated by tools/build-carve-bundle.sh - do not edit by hand.',
    '// Bundled from markup-carve/carve-rs commit 37ed8904f2a5dd540fd0bddb2294fe348f17eb7d',
    '// Built (UTC): 2026-08-27T00:21:48Z',
  ].join('\n')
  const found = vendorProvenance(head, 'intellij-carve', KNOWN)
  assert.equal(found?.target, 'carve-rs')
  assert.equal(found?.ref, '37ed8904f2a5dd540fd0bddb2294fe348f17eb7d')
})

test('a vendored build with no commit still names its source', () => {
  const head = '/* Vendored from markup-carve/carve-rs */'
  const found = vendorProvenance(head, 'x', KNOWN)
  assert.equal(found?.target, 'carve-rs')
  assert.equal(found?.ref, null, 'reported as unpinned rather than dropped')
})

test('a vendor header naming something that is not a repo is rejected', () => {
  assert.equal(vendorProvenance('// Bundled from markup-carve/package', 'x', KNOWN), null)
})

test('a vendored build layers like a declared edge, a CI checkout does not', () => {
  // The distinction the whole feature turns on: shipping the bytes is
  // containment and constrains release order; checking the tree out is
  // coupling and does not.
  const edges = [
    { repo: 'plugin', target: 'carve-rs', kind: 'vendor', field: 'vendored' },
    { repo: 'other', target: 'carve-rs', kind: 'ci', field: 'workflow' },
  ]
  const { layer } = releaseLayers(edges, ['carve-rs', 'plugin', 'other'])
  assert.equal(layer.get('plugin'), 1, 'the vendored build layers above its source')
  assert.equal(layer.get('other'), 0, 'the CI checkout leaves it unconstrained')
})

/*
 * THE DECLARATION LEDGER.
 *
 * It holds what no detector can read, which is exactly the content that rots
 * without a gate - the failure the Dependency Map was built to end. So the
 * parse is strict and the audit runs in BOTH directions.
 */

/* The shared parser reads a PATH, which is right for the real ledger and awkward
 * for a one-line fixture. This writes the fixture out rather than reimplementing
 * the parse - a second parser in the tests is the duplication this refactor
 * removed from the tool. */
function parseFixture(text) {
  const { mkdtempSync, writeFileSync: write } = nodeFs
  const dir = mkdtempSync(nodeOs.tmpdir() + '/carve-ledger-')
  const file = nodePath.join(dir, 'undeclared-dependencies.txt')
  write(file, text)
  return parseDependencyLedger(file)
}

const LIVE = new Set(['carve', 'carve-js', 'emacs-carve', 'carve-grammars', 'carve-rs', 'homebrew-carve'])

test('a well formed declaration parses', () => {
  const { entries, failures } = parseFixture(
    '# a comment\n\nemacs-carve -> carve-grammars  vendors  a copied table with no header\n',
  )
  const rows = [...entries.values()]
  const problems = failures
  assert.deepEqual(problems, [])
  assert.equal(rows.length, 1)
  assert.deepEqual(
    { ...rows[0], line: undefined },
    { repo: 'emacs-carve', target: 'carve-grammars', kind: 'vendors', reason: 'a copied table with no header', line: undefined },
  )
})

test('a malformed line is reported rather than skipped', () => {
  // Skipping it silently is how a ledger comes to describe less than it claims.
  const { entries, failures } = parseFixture('emacs-carve depends on carve-grammars\n')
  const rows = [...entries.values()]
  const problems = failures
  assert.equal(rows.length, 0)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /line 1/)
})

test('an unknown kind is refused', () => {
  const { failures: problems } = parseFixture('a -> b  sortof  because\n')
  assert.match(problems[0], /unknown kind/)
})

test('the same pair cannot be declared twice', () => {
  const { failures: problems } = parseFixture(
    'a -> b  vendors  one reason\na -> b  couples  another reason\n',
  )
  // The shared parser names BOTH reasons, so the author can see which one is
  // being thrown away rather than only that a collision happened.
  assert.match(problems[0], /duplicate entry: a -> b/)
  assert.match(problems[0], /one reason/)
  assert.match(problems[0], /another reason/)
})

test('a declaration the tool can now detect on its own is stale', () => {
  // The good failure: someone taught a detector to read this dependency, so the
  // hand-written note is redundant and has to go, or the ledger becomes the
  // prose it replaced.
  const rows = [{ repo: 'emacs-carve', target: 'carve-grammars', kind: 'vendors', reason: 'x', line: 3 }]
  const detected = [{ repo: 'emacs-carve', target: 'carve-grammars' }]
  const problems = auditDependencyLedger(rows, detected, LIVE)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /detected on its own now - delete the line/)
})

test('a suppression that no longer suppresses anything is stale', () => {
  const rows = [{ repo: 'carve-rs', target: 'homebrew-carve', kind: 'not-a-dependency', reason: 'x', line: 5 }]
  const problems = auditDependencyLedger(rows, [], LIVE)
  assert.match(problems[0], /suppresses an edge nothing detects any more/)
})

test('a suppression that still has something to suppress is clean', () => {
  const rows = [{ repo: 'carve-rs', target: 'homebrew-carve', kind: 'not-a-dependency', reason: 'x', line: 5 }]
  const detected = [{ repo: 'carve-rs', target: 'homebrew-carve' }]
  assert.deepEqual(auditDependencyLedger(rows, detected, LIVE), [])
})

test('a declaration naming a repo that does not exist is refused', () => {
  const rows = [{ repo: 'emacs-carve', target: 'carve-nope', kind: 'vendors', reason: 'x', line: 2 }]
  const problems = auditDependencyLedger(rows, [], LIVE)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /no such repo "carve-nope"/)
})

test('the committed ledger is valid and every line is still needed', async () => {
  // The file itself, not a fixture: a ledger that parses in theory and is
  // malformed on disk has gated nothing.
  const { readFileSync, existsSync } = await import('node:fs')
  const { resolve, dirname } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const path = resolve(root, 'resources/undeclared-dependencies.txt')
  assert.ok(existsSync(path), 'the ledger exists')
  const { entries, failures } = parseDependencyLedger(path)
  assert.deepEqual(failures, [], 'the committed ledger parses cleanly')
  assert.ok(entries.size > 0, 'it holds at least one declaration')
})

test('a vendor header whose commit is on a later line still pins', () => {
  // intellij-carve's CSS header puts the repo on one line and the commit on the
  // next. A same-line pattern called that unpinned, which is true of the line
  // and false of the file.
  const head = [
    '/*',
    ' * VENDORED from markup-carve/carve-js src/recipes.css',
    ' * version 0.1.0, commit e0042b9',
    ' */',
  ].join('\n')
  const found = vendorProvenance(head, 'intellij-carve', LIVE)
  assert.equal(found?.target, 'carve-js')
  assert.equal(found?.ref, 'e0042b9')
})

/*
 * THE BANNER IS THE ONLY THING THAT CAN REPORT A RUN FROM A STALE TREE.
 *
 * A regeneration rewrites every line of the page, so a section that stopped
 * being emitted leaves no trace a reviewer could catch in the diff - it looks
 * like data that moved. That is not a hypothetical shape: a run from a branch
 * older than the CI-read edges published 61 edges instead of 86 with the Release
 * order section gone, and it went unnoticed until somebody asked where their
 * dependency information had gone.
 *
 * Both directions are asserted, because a banner that fires when it should not
 * is worse than none: the workflow REFUSES TO PUBLISH when it sees one, so a
 * false positive stops the nightly regeneration outright.
 */
test('the stale-source banner fires only when the run did not come from main', () => {
  assert.equal(
    staleSourceBanner({ sha: 'a'.repeat(40), mainSha: 'a'.repeat(40) }),
    null,
    'a run from the tip of main carries no banner',
  )
})

test('a banner needs both sides of the comparison, and says neither when it has one', () => {
  // No .git, no network, a remote not called origin: none of those mean the run
  // was stale, they mean the question went unanswered. A banner on "unknown"
  // would fire on every tarball and be tuned out inside a week - and it would
  // also break the workflow, which treats a banner as a reason not to publish.
  assert.equal(staleSourceBanner({}), null)
  assert.equal(staleSourceBanner({ sha: 'a'.repeat(40) }), null)
  assert.equal(staleSourceBanner({ mainSha: 'b'.repeat(40) }), null)
})

test('the banner names both commits, short, so the reader can tell what ran', () => {
  const text = staleSourceBanner({ sha: 'deadbeefcafe1234', mainSha: '0123456789abcdef' })
  assert.match(text, /deadbeef/, 'the commit the run came from')
  assert.match(text, /01234567/, 'the commit it should have come from')
  assert.doesNotMatch(text, /deadbeefcafe1234/, 'abbreviated, not the full sha')
  assert.match(text, /Regenerate from/, 'and what to do about it')
})
/*
 * WHICH DIFFERENCES ARE WORTH A COMMIT.
 *
 * Both real cases below happened on 2026-08-27, forty minutes apart, and they
 * are the reason the mask exists rather than a plain `git diff`: the first pair
 * differed only because time had passed, the second because seven repos had
 * released. A plain diff calls both a change and the wiki history stops meaning
 * anything.
 *
 * The dangerous direction is a change wrongly called cosmetic, since that one
 * is never published and leaves no trace - so the tag distance is asserted
 * separately from the head distance, which is the pair most easily confused.
 */
const TREE_LINE = '  carve-php                0.1.6      +2'
const EDGE_NOTE = '| `x` | `y` | `0.1.4` | 34 BEHIND 0.1.4, 44 behind main |'

test('a commit landing on a target repo is not a change to the map', () => {
  const before = [TREE_LINE, EDGE_NOTE].join('\n')
  const after = before.replace('+2', '+3').replace('44 behind main', '45 behind main')
  assert.notEqual(before, after, 'the raw text really does differ')
  assert.equal(isSubstantiveChange(before, after), false, 'and it is still only the clock')
})

test('distance from a TAG is news, and stays unmasked', () => {
  // `34 BEHIND 0.1.4` moves when the target releases or when the pin moves.
  // Masking it alongside `behind main` would silence the two events this page
  // exists to report, and silence them invisibly.
  const before = EDGE_NOTE
  const after = EDGE_NOTE.replace('34 BEHIND', '35 BEHIND')
  assert.equal(isSubstantiveChange(before, after), true)
  assert.match(volatileMask(after), /35 BEHIND 0\.1\.4/)
})

test('a release is substantive even though its lag counter moved too', () => {
  // The shape of the 12:21 run: seven repos went UNRELEASED to 0.1.0, and their
  // lag counters reset in the same render. The masked fields must not swallow
  // the version beside them.
  const before = '    ├── astro-carve              UNRELEASED'
  const after = '    ├── astro-carve              0.1.0'
  assert.equal(isSubstantiveChange(before, after), true)
})

test('a page that does not exist yet is always worth writing', () => {
  assert.equal(isSubstantiveChange(null, 'anything'), true)
  assert.equal(isSubstantiveChange(undefined, 'anything'), true)
})

test('the mask leaves everything it does not target byte-identical', () => {
  const untouched = [
    '| 🔴 not a release | A commit that was never tagged. |',
    '  carve_rs -->|"0.1.4"| carve_wasm',
    'Read 56 repositories, 86 edges, from each repository default branch.',
  ].join('\n')
  assert.equal(volatileMask(untouched), untouched)
})

test('a lag counter is masked where it sits mid-line, not only at end of line', () => {
  // Found by running the real thing rather than by reading the regex: a repo
  // with couplings prints its lag BEFORE that list, so an end-of-line anchor
  // masked the bare rows and missed exactly the rows that tick most often.
  // intellij-carve going +3 to +4 was still forcing a publish.
  const before = '  intellij-carve           0.1.6      +3  <- carve, carve-css, carve-js'
  const after = '  intellij-carve           0.1.6      +4  <- carve, carve-css, carve-js'
  assert.equal(isSubstantiveChange(before, after), false)
  const soft = '  carve-go                 v0.1.0     +13  ~ carve, carve-rb'
  assert.equal(isSubstantiveChange(soft, soft.replace('+13', '+14')), false)
})
