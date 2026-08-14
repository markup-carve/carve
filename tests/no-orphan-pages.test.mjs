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
 * thing that exists and has no reader. This test asks the question.
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
