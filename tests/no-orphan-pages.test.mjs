/**
 * Every docs page must be reachable from the site navigation.
 *
 * WHY. `docs/html-import.md` and `docs/ast-source-layout.md` sat in the repo
 * with no nav entry, no sidebar entry and no inbound link from any other page -
 * reachable only by site search. `ast-source-layout.md` even publishes a JSON
 * schema to `docs/public/`, so the schema shipped while the page explaining it
 * could not be found. Nothing failed, because "is this page reachable" was a
 * question nobody asked.
 *
 * A page with no route is the same defect as a corpus fixture with no page: a
 * thing that exists and has no reader. This test asks BOTH questions - see the
 * second block below for the fixture direction, which this file named and then
 * did not check.
 *
 * To retire a page deliberately, delete it. To keep one out of the nav on
 * purpose, add it to UNROUTED with the reason - that turns an oversight into a
 * decision someone signed.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { numberExamples, readExampleFiles, scanExampleSource } from '../scripts/lib/example-sections.mjs'
import { SECTION_HEADING_PREFIX, collectSections, fenceLanguages, headerOnlyPages, nonHeadingSections, optionalCaseFences, parseOptionalPages, parsePages, routePages, scanPageSources } from '../scripts/lib/example-page-manifest.mjs'
import { TARGET_EXTENSIONS, targetNames } from '../scripts/lib/corpus-targets.mjs'
import { optionalFeatureTitles } from '../scripts/lib/optional-feature-titles.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const config = readFileSync(resolve(repoRoot, 'docs/.vitepress/config.ts'), 'utf8')

const UNROUTED = new Map([
  ['docs/README.md', 'GitHub-facing orientation for people browsing docs/ source; srcExclude keeps it off the site.'],
  ['docs/index.md', 'The home page itself - it is the route everything else hangs off.'],
  ['docs/experiments/container-ownership.md', 'Compatibility evidence linked from the issue and pull request, not a permanent user guide.'],
  ['docs/.vitepress/carve-wasm/README.md', 'Build-tooling note inside .vitepress, not a site page.'],
])

/*
 * Only TRACKED pages are checked. Everything under docs/examples/ is generated
 * and gitignored, and its nav wiring is the page generator's contract - listing
 * generated files here would make this test depend on build order.
 */
const tracked = execFileSync('git', ['ls-files', 'docs'], { cwd: repoRoot, encoding: 'utf8' })
  .split('\n')
  .filter((path) => path.endsWith('.md'))

test('the page list is not empty', () => {
  /* A failed git call would make the assertion below pass over nothing. */
  assert.ok(tracked.length > 20, `expected the tracked docs pages, found ${tracked.length}`)
})

test('every docs page is reachable from the site navigation', () => {
  const orphans = []
  for (const path of tracked) {
    if (UNROUTED.has(path)) continue
    const route = path.replace(/^docs\//, '').replace(/\.md$/, '').replace(/\/index$/, '/')
    /* Both quoting styles appear in config.ts, and a directory route may be
     * written with or without its trailing slash. */
    const spellings = route.endsWith('/')
      ? [`'/${route}'`, `'/${route.slice(0, -1)}'`]
      : [`'/${route}'`, `'/${route}/'`]
    if (spellings.some((spelling) => config.includes(spelling))) continue
    orphans.push(`${path} (route /${route})`)
  }
  assert.deepEqual(
    orphans,
    [],
    'these pages have no nav or sidebar entry - wire them into docs/.vitepress/config.ts,\n' +
      'delete them, or add them to UNROUTED in this test with a reason:\n' + orphans.join('\n'),
  )
})

/*
 * A page with no `description:` still renders, so nothing ever complained -
 * but VitePress feeds that key to the local search index and the social card,
 * and 30 of 42 pages had none. Being reachable and being findable are the same
 * concern, which is why this check lives here.
 */
test('every docs page carries a description', () => {
  const missing = []
  for (const path of tracked) {
    /* Not site pages: srcExclude drops README.md, and anything under
     * .vitepress/ is build tooling that VitePress never renders. */
    if (path.endsWith('README.md') || path.startsWith('docs/.vitepress/')) continue
    const text = readFileSync(resolve(repoRoot, path), 'utf8')
    const frontmatter = text.startsWith('---\n') ? text.slice(4, text.indexOf('\n---', 4)) : ''
    if (!/^description:/m.test(frontmatter)) missing.push(path)
  }
  assert.deepEqual(
    missing,
    [],
    'these pages have no description: - search results and social cards fall back to nothing:\n' + missing.join('\n'),
  )
})

test('every UNROUTED waiver still names a real page', () => {
  /* A waiver outliving its page would silently excuse a future file of the
   * same name. */
  const stale = [...UNROUTED.keys()].filter((path) => !tracked.includes(path))
  assert.deepEqual(stale, [], `these waivers name pages that no longer exist: ${stale.join(', ')}`)
})

/*
 * THE SECOND DIRECTION: every corpus fixture must be routed to a docs page.
 *
 * WHY. The docstring above named this exact defect - "a corpus fixture with no
 * page" - and then only checked the sibling. The question is asked, but in
 * `scripts/generate-example-pages.mjs` ("fixture ... is routed to no page"),
 * which is reached through `docs:pages` and so runs only under `docs:dev` and
 * `docs:build`. Corpus 394 was added in carve#1482, reached CI unrouted, and
 * the whole local suite passed; the signal arrived from a later job, after the
 * point where a contributor is still looking.
 *
 * The reason it could not be asked here is real, and it is why this block does
 * not go looking for a page. `docs/examples/` is generated and gitignored, so
 * when this test runs there is no generated page on disk to find a fixture in.
 * It does not need one: the ROUTE is tracked. `resources/example-pages.txt` is
 * the manifest the generator reads, and `scripts/lib/example-sections.mjs` is
 * the naming operation both sides already share, so the manifest answers the
 * question without a build.
 */
const exampleScan = scanExampleSource(readExampleFiles(repoRoot).split('\n'))
numberExamples(exampleScan)
const sectionSlugByFixture = new Map(exampleScan.examples.map((example) => [example.corpusName, example.slug]))

/* The census is the fixtures a contributor actually commits, not the scanner's
 * own account of what it extracted - the same reason scripts/lib/example-pair-
 * census.mjs exists. `corpus:build` unlinks every .crv before regenerating, so
 * the two agree by construction, and the guard below fails loudly if they stop. */
const corpusFixtures = execFileSync('git', ['ls-files', 'tests/corpus'], { cwd: repoRoot, encoding: 'utf8' })
  .split('\n')
  .filter((path) => path.endsWith('.crv'))
  .map((path) => path.slice('tests/corpus/'.length, -'.crv'.length))

/*
 * THE MANIFEST ITSELF, read by the generator's own parser.
 *
 * This block used to approximate the page file with a filter that kept only
 * INDENTED lines, on the reasoning that a route entry is the only indented
 * form. It is - but a filter that keeps only indented lines cannot see a
 * `[id]` heading, a `> description` or a `key:` line, so every claim the
 * generator makes about those was unreachable from `npm test`, and two of them
 * were worse than unchecked: an entry sitting ABOVE the first `[id]` still
 * landed in the route set below, so it SATISFIED the routing assertions
 * instead of failing them, and a malformed line at column zero was dropped in
 * silence (carve#1492).
 *
 * So the parsing now lives in scripts/lib/example-page-manifest.mjs and this
 * file calls it. The generator calls the same functions and fails on the first
 * complaint, which is why the assertions below can be `deepEqual` against an
 * empty list: an empty complaint list is exactly the condition under which
 * `docs:build` proceeds.
 */
const { pages, complaints: pageComplaints } = parsePages(
  readFileSync(resolve(repoRoot, 'resources/example-pages.txt'), 'utf8'))
const { pages: optionalPages, complaints: optionalPageComplaints } = parseOptionalPages(
  readFileSync(resolve(repoRoot, 'resources/optional-example-pages.txt'), 'utf8'))
const { sectionsBySlug, segmentsByName, complaints: sectionComplaints } = collectSections(repoRoot)
/*
 * FAIL-FAST ORDER, mirroring the generator, which exits on the section
 * complaints before it resolves a single route. Two section titles that
 * slugify to one slug also cost that slug's fixtures their names, so routing
 * would report every entry naming one of them as dangling - a consequence of
 * the collision, reported in the generator's voice for a run the generator
 * never performs. The collision itself is asserted just below.
 */
const { complaints: routeComplaints } = sectionComplaints.length === 0
  ? routePages({ pages, sectionsBySlug, segmentsByName })
  : { complaints: [] }
const routeEntries = new Set(pages.flatMap((page) => page.slugs))

test('both page manifests parsed something', () => {
  /* A parser returning nothing would make every assertion below pass over an
   * empty manifest - the same liveness floor the corpus census carries. */
  assert.ok(pages.length > 5, `expected the configured example pages, found ${pages.length}`)
  assert.ok(optionalPages.length > 1, `expected the optional example pages, found ${optionalPages.length}`)
  assert.ok(sectionsBySlug.size > 20, `expected the example source sections, found ${sectionsBySlug.size}`)
})

test('the page manifest has no structural complaint', () => {
  assert.deepEqual(
    pageComplaints,
    [],
    'resources/example-pages.txt would stop `npm run docs:build` for these reasons:\n' + pageComplaints.join('\n'),
  )
})

test('the optional page manifest has no structural complaint', () => {
  assert.deepEqual(
    optionalPageComplaints,
    [],
    'resources/optional-example-pages.txt would stop `npm run docs:build` for these reasons:\n' +
      optionalPageComplaints.join('\n'),
  )
})

test('every example source section has a slug of its own', () => {
  /* scanExampleSource throws on two identical section TITLES. Two different
   * titles that slugify to one slug arrive here instead, where a page entry
   * naming that slug could no longer say which section it meant. */
  assert.deepEqual(
    sectionComplaints,
    [],
    'resources/examples/*.md sections collide after slugification:\n' + sectionComplaints.join('\n'),
  )
})

test('every page-file entry resolves to exactly one reading location', () => {
  /*
   * The routing AMBIGUITIES, which a Set of entry names cannot hold: a page
   * naming both a section and one of that section's own fixtures, the same
   * pairing spread across two pages, and one fixture reached from two pages.
   * Each of those generates two readable pages, so nothing downstream ever
   * notices that one rule acquired two apparently authoritative homes.
   */
  assert.deepEqual(
    routeComplaints,
    [],
    'resources/example-pages.txt routes ambiguously:\n' + routeComplaints.join('\n'),
  )
})

test('every page naming a hand-written source can read it', () => {
  /* Reachable for `examples-tier3.md` alone before this, and only because
   * tests/examples-tier3.test.mjs happens to read that one file at module
   * scope. A second `source:` value would have inherited nothing. */
  const { complaints } = scanPageSources(pages, repoRoot)
  assert.deepEqual(
    complaints,
    [],
    'these resources/example-pages.txt source: values cannot be generated from:\n' + complaints.join('\n'),
  )
})

/*
 * THE SECTION HEADING ITSELF, which the generator used to check where nothing
 * could reach it - and where one half of the check could not fire at all.
 *
 * WHY. `scripts/generate-example-pages.mjs` re-emits a section heading at the
 * page's level by slicing off the two `#`s and keeping the rest verbatim. It
 * guarded that with `!heading.startsWith('## ') || heading.startsWith('### ')`.
 * The second half is unreachable by construction: `scanExampleSource` opens a
 * section only on `/^##\s+/`, so a `###` line never becomes `bodyLines[0]`, and
 * the clause implied a level guard the scanner already makes impossible
 * (carve#1496). The first half is NOT unreachable - `\s` is not only the space,
 * and `##` followed by U+00A0 opens a section whose generated line VitePress
 * renders as a paragraph, losing the heading and its anchor while the section
 * keeps its corpus fixtures. A tab renders as a heading but is rejected for the
 * other reason the lib records: the rewrite that pushes a shared page's
 * sections to level 3 matches `SECTION_HEADING_PREFIX` literally.
 *
 * So the live half moved into the manifest lib, and it is asked here of the two
 * populations the generator generates from.
 */
test('every routed section heading survives being generated', () => {
  const complaints = nonHeadingSections([...sectionsBySlug.values()], 'resources/examples/*.md')
  assert.deepEqual(
    complaints,
    [],
    'these resources/examples/*.md headings would stop being headings once generated:\n' + complaints.join('\n'),
  )
})

test('every hand-written source heading survives being generated', () => {
  const { sectionsByPage } = scanPageSources(pages, repoRoot)
  const complaints = [...sectionsByPage].flatMap(([page, sections]) =>
    nonHeadingSections(sections, `page "${page.id}" source resources/${page.source}`))
  assert.deepEqual(
    complaints,
    [],
    'these source: headings would stop being headings once generated:\n' + complaints.join('\n'),
  )
})

test('a heading whose separator is not a space is reported', () => {
  /*
   * The reachability proof. Without it the two assertions above pass for a
   * check that cannot fail, which is the defect carve#1496 is about - so every
   * separator the scanner's `/^##\s+/` CAN produce is asserted here, in both
   * directions.
   */
  const sections = (heading) => [{ bodyLines: [heading] }]
  assert.deepEqual(nonHeadingSections(sections('## Title'), 'ctx'), [])
  for (const [label, separator] of [['tab', '\t'], ['U+00A0', '\u00a0'], ['form feed', '\u000c'], ['vertical tab', '\u000b']]) {
    const complaints = nonHeadingSections(sections(`##${separator}Title`), 'ctx')
    assert.equal(complaints.length, 1, `a ${label} after ## must be reported`)
    assert.match(complaints[0], /^ctx heading .* separates "##" from its title with U\+[0-9A-F]{4} instead of a space/,
      'the offending character is invisible, so the message has to name its code point')
  }
  assert.match(nonHeadingSections(sections('##\u00a0Title'), 'ctx')[0], /U\+00A0/)
})

test('the guard and the level rewrite share one heading prefix', () => {
  /* The rewrite in scripts/generate-example-pages.mjs that pushes a shared
   * page's non-owner sections to level 3 matches this exact prefix. A guard
   * that accepted a heading the rewrite does not recognize would leave that
   * section at level 2 among page-mates that all moved down. */
  assert.equal(SECTION_HEADING_PREFIX, '## ')
})

test('no page is an unshared header-only page', () => {
  /* A page with no entries and no source is legitimate only as the frontmatter
   * owner of an out: path another entry also writes to. Alone, it publishes a
   * heading and no examples. */
  const complaints = headerOnlyPages(pages, optionalPages)
  assert.deepEqual(
    complaints,
    [],
    'these resources/example-pages.txt entries would publish no examples:\n' + complaints.join('\n'),
  )
})

test('the corpus census agrees with the example source', () => {
  /* Either list arriving empty - a failed git call, a moved source file - would
   * make the routing assertion below pass over nothing. */
  assert.ok(corpusFixtures.length > 1000, `expected the tracked corpus fixtures, found ${corpusFixtures.length}`)
  const unsourced = corpusFixtures.filter((name) => !sectionSlugByFixture.has(name))
  const unwritten = [...sectionSlugByFixture.keys()].filter((name) => !corpusFixtures.includes(name))
  assert.deepEqual(
    { unsourced, unwritten },
    { unsourced: [], unwritten: [] },
    'tests/corpus and resources/examples/ disagree about which fixtures exist - run `npm run corpus:build`',
  )
})

test('every corpus fixture is routed to a docs page', () => {
  /* An entry names either a section slug, which routes every pair in that
   * section, or one fixture name, which routes that pair alone. */
  const unrouted = corpusFixtures.filter(
    (name) => !routeEntries.has(name) && !routeEntries.has(sectionSlugByFixture.get(name)),
  )
  assert.deepEqual(
    unrouted,
    [],
    'these corpus fixtures are on no docs page, so nothing explains them to a reader -\n' +
      'add the fixture name, or its section slug, to resources/example-pages.txt:\n' + unrouted.join('\n'),
  )
})

/*
 * The optional corpus has the same shape and the same gap. Its generator check
 * is per FEATURE, not per case, so a new case under a feature that already has
 * a page is routed the moment it is added - but a new feature is not, and that
 * too was only visible at `docs:build`.
 */
const optionalCases = JSON.parse(readFileSync(resolve(repoRoot, 'tests/corpus-optional/manifest.json'), 'utf8')).cases
const manifestFeatures = [...new Set(optionalCases.map((item) => item.feature))]
const assignedFeatures = new Set(optionalPages.flatMap((page) => page.features))

test('the optional-corpus feature census is not empty', () => {
  /* Either list arriving empty would make every assertion below pass over
   * nothing - the same liveness floor the corpus census carries. */
  assert.ok(manifestFeatures.length > 10, `expected the optional-corpus features, found ${manifestFeatures.length}`)
  assert.ok(assignedFeatures.size > 10, `expected the optional page assignments, found ${assignedFeatures.size}`)
})

test('every optional-corpus feature is routed to a docs page', () => {
  const unrouted = manifestFeatures.filter((feature) => !assignedFeatures.has(feature))
  assert.deepEqual(
    unrouted,
    [],
    'these manifest features appear on no optional page, so the behavior they pin has no reader -\n' +
      'add them to resources/optional-example-pages.txt:\n' + unrouted.join('\n'),
  )
})

/*
 * THE REVERSE DIRECTION of the same manifest. A page naming a feature the
 * manifest does not have generates a heading with nothing under it, and the
 * generator says so ("readers would see a nonexistent behavior") - but only
 * under `docs:build`. Both populations are already read above, so asking is
 * free, and the failure names the line that is actually wrong instead of
 * reporting the feature as merely unrouted.
 */
test('every optional page names a feature the manifest still has', () => {
  const dangling = [...assignedFeatures].filter((feature) => !manifestFeatures.includes(feature))
  assert.deepEqual(
    dangling,
    [],
    'these resources/optional-example-pages.txt entries name no manifest feature -\n' +
      'the page would introduce a behavior nothing pins:\n' + dangling.join('\n'),
  )
})

/*
 * THE TITLE, which is a second and independent claim about the same features.
 *
 * WHY. `scripts/generate-example-pages.mjs` requires an authored heading for
 * every manifest feature - deliberately, because title-casing the id yields
 * "Bare Url Autolink", a slug wearing capitals. But the requirement lived
 * inside that script, which only `docs:pages`, `docs:dev` and `docs:build`
 * reach, so a feature added without a title passed the entire local suite and
 * went red in a later job (carve#1490, hit for real while landing carve#1489).
 * Being routed to a page and being NAMED on it are different questions; the
 * routing check above cannot answer the second one.
 *
 * The map is now scripts/lib/optional-feature-titles.mjs, imported by the
 * generator and by this test, so the two cannot drift.
 */
test('every optional-corpus feature has an authored title', () => {
  const unnamed = manifestFeatures.filter((feature) => !optionalFeatureTitles.get(feature))
  assert.deepEqual(
    unnamed,
    [],
    'these manifest features have no authored title, so their generated heading would be a slug -\n' +
      'name them in scripts/lib/optional-feature-titles.mjs:\n' + unnamed.join('\n'),
  )
})

test('every authored title names a feature the manifest still has', () => {
  /* A title outliving its feature would silently name a future feature that
   * happens to reuse the slug - the same hazard the UNROUTED waivers carry. */
  const stale = [...optionalFeatureTitles.keys()].filter((feature) => !manifestFeatures.includes(feature))
  assert.deepEqual(
    stale,
    [],
    'these scripts/lib/optional-feature-titles.mjs entries name no manifest feature:\n' + stale.join('\n'),
  )
})

/*
 * A duplicate route entry, and an entry naming no section or fixture at all,
 * each had a test of their own here, derived from the raw indented lines. Both
 * claims are now made by the shared parser and router above - the first as a
 * `duplicate entry` complaint, the second as `matches no source section or
 * fixture` - with the generator's own wording, so they are not repeated here.
 */

/*
 * THE TARGET each optional case pins, and the fence language its expected
 * output is shown in.
 *
 * WHY. The generator derived the extension from a closed four-arm ternary
 * (`markdown` -> .md, `plain` -> .txt, `ansi` -> .ansi, anything else -> .html)
 * and then looked the language up by extension, so its
 * `unknown target extension` failure could not fire over that range - while the
 * default arm quietly claimed HTML for `carve`, a target that has had a `.fmt`
 * expected file since `TARGET_EXTENSIONS` grew it and that every other reader of
 * this manifest honors. Measured on the old generator: a `target: "carve"` case
 * did not fail, it published the case's `.html` file under an `html` fence -
 * an HTML expectation for a case pinned on Carve output (carve#1496). Both maps
 * are keyed by target now, and both directions are asserted, the shape
 * carve#1490 gave the feature titles.
 */
test('every optional-corpus case resolves an expected file and a fence language', () => {
  const { fences, complaints } = optionalCaseFences(optionalCases)
  assert.deepEqual(
    complaints,
    [],
    'these tests/corpus-optional/manifest.json cases would stop `npm run docs:build`:\n' + complaints.join('\n'),
  )
  assert.equal(fences.size, optionalCases.length, 'every case must resolve exactly one fence')
})

test('a case naming a target nobody implements is reported', () => {
  /* The reachability proof for the guard that replaced the closed ternary: the
   * complaint names the TARGET, which is the wrong thing in the manifest, and
   * not a derived `.html` filename that was never asked for. */
  const { fences, complaints } = optionalCaseFences([{ slug: '99-invented', feature: 'x', target: 'pdf' }])
  assert.equal(complaints.length, 1)
  assert.match(complaints[0], /names target "pdf"/)
  assert.match(complaints[0], new RegExp(targetNames().join(', ')))
  assert.equal(fences.size, 0)
})

test('a case with no target pins the default HTML pairing', () => {
  const { fences } = optionalCaseFences([{ slug: '01-plain', feature: 'x' }, { slug: '02-fmt', feature: 'x', target: 'carve' }])
  assert.deepEqual([...fences.values()], [
    { extension: '.html', language: 'html' },
    /* The case the ternary got wrong. */
    { extension: '.fmt', language: 'carve' },
  ])
})

test('every corpus target has a fence language, and every fence language a target', () => {
  /* A sixth target added to scripts/lib/corpus-targets.mjs with no fence
   * language would otherwise reach the generator, which is the only place that
   * pairing is needed - and the generator is what `npm test` does not run. */
  assert.deepEqual(targetNames().filter((target) => !fenceLanguages.has(target)), [])
  assert.deepEqual([...fenceLanguages.keys()].filter((target) => !Object.hasOwn(TARGET_EXTENSIONS, target)), [])
})
