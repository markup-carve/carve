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

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const config = readFileSync(resolve(repoRoot, 'docs/.vitepress/config.ts'), 'utf8')

const UNROUTED = new Map([
  ['docs/README.md', 'GitHub-facing orientation for people browsing docs/ source; srcExclude keeps it off the site.'],
  ['docs/index.md', 'The home page itself - it is the route everything else hangs off.'],
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
const sectionSlugs = new Set(exampleScan.sections.map((section) => section.slug))

/* The census is the fixtures a contributor actually commits, not the scanner's
 * own account of what it extracted - the same reason scripts/lib/example-pair-
 * census.mjs exists. `corpus:build` unlinks every .crv before regenerating, so
 * the two agree by construction, and the guard below fails loudly if they stop. */
const corpusFixtures = execFileSync('git', ['ls-files', 'tests/corpus'], { cwd: repoRoot, encoding: 'utf8' })
  .split('\n')
  .filter((path) => path.endsWith('.crv'))
  .map((path) => path.slice('tests/corpus/'.length, -'.crv'.length))

/* A route entry is the only kind of line in the page file that is indented;
 * page ids, `key:` lines, descriptions and comments all start at column zero.
 * This mirrors parsePages in the generator, which reads an indented line as an
 * entry after every other form has failed to match. */
const routeEntries = new Set(
  readFileSync(resolve(repoRoot, 'resources/example-pages.txt'), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('  ') && line.trim() !== '')
    .map((line) => line.trim()),
)

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

test('every route entry names a section or fixture that exists', () => {
  /* Without this, a typo in the manifest reports as the FIXTURE being
   * unrouted, which sends the reader to the corpus instead of to the line that
   * is actually wrong. */
  const dangling = [...routeEntries].filter((entry) => !sectionSlugs.has(entry) && !sectionSlugByFixture.has(entry))
  assert.deepEqual(
    dangling,
    [],
    'these resources/example-pages.txt entries match no section slug and no fixture name:\n' + dangling.join('\n'),
  )
})

/*
 * The optional corpus has the same shape and the same gap. Its generator check
 * is per FEATURE, not per case, so a new case under a feature that already has
 * a page is routed the moment it is added - but a new feature is not, and that
 * too was only visible at `docs:build`.
 */
test('every optional-corpus feature is routed to a docs page', () => {
  const manifest = JSON.parse(readFileSync(resolve(repoRoot, 'tests/corpus-optional/manifest.json'), 'utf8'))
  const features = [...new Set(manifest.cases.map((item) => item.feature))]
  assert.ok(features.length > 10, `expected the optional-corpus features, found ${features.length}`)
  const assigned = new Set(
    readFileSync(resolve(repoRoot, 'resources/optional-example-pages.txt'), 'utf8')
      .split('\n')
      .filter((line) => line.startsWith('  ') && line.trim() !== '')
      .map((line) => line.trim()),
  )
  const unrouted = features.filter((feature) => !assigned.has(feature))
  assert.deepEqual(
    unrouted,
    [],
    'these manifest features appear on no optional page, so the behavior they pin has no reader -\n' +
      'add them to resources/optional-example-pages.txt:\n' + unrouted.join('\n'),
  )
})
