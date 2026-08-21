/*
 * Reading and validating the two example-page manifests.
 *
 * WHY THIS IS ITS OWN MODULE. Every structural claim about
 * `resources/example-pages.txt` and `resources/optional-example-pages.txt`
 * used to live inside `scripts/generate-example-pages.mjs`, which only
 * `docs:pages`, `docs:dev` and `docs:build` invoke. That script removes and
 * rewrites `docs/examples/` at module scope and calls `process.exit(1)` on the
 * first problem, so a test cannot import it - which is why the suite instead
 * approximated the manifest with a one-line filter:
 *
 *     .filter((line) => line.startsWith('  ') && line.trim() !== '')
 *
 * A filter that keeps only INDENTED lines cannot see a `[id]` heading, a
 * `> description` or a `key:` line, so none of the claims about them were
 * reachable from `npm test`. Two of them were worse than unchecked: a route
 * entry sitting above the first `[id]` was still collected, so it SATISFIED
 * the routing assertions instead of failing them, and a malformed line at
 * column zero was skipped in silence (carve#1492).
 *
 * So the parsing moves here and both sides call it. Nothing in this module
 * exits or throws on bad input: each function returns the parsed manifest plus
 * a list of complaints, the generator fails on the first one exactly as it did
 * before, and the test asserts the list is empty. Same split as
 * `example-sections.mjs`, `corpus-targets.mjs` and
 * `optional-feature-titles.mjs`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TARGET_EXTENSIONS, targetNames, targetOf } from './corpus-targets.mjs'
import { exampleFiles, numberExamples, readExampleFiles, scanExampleSource } from './example-sections.mjs'

/*
 * A page id line opens a page; everything after it belongs to that page until
 * the next one. A line arriving before the first `[id]` therefore has no page
 * to attach to, which is the case the indented-line filter used to swallow.
 */
const pageHeading = /^\[([^\]]+)\]\s+(.+)$/

export const parsePages = (source) => {
  const pages = []
  const complaints = []
  const seenSlugs = new Set()
  let current = null
  for (const [index, line] of source.split('\n').entries()) {
    if (line.trim() === '' || line.startsWith('#')) continue
    const heading = pageHeading.exec(line)
    if (heading) {
      current = { id: heading[1], title: heading[2], description: null, out: null, index: null, source: null, order: 0, level: 2, slugs: [] }
      pages.push(current)
      continue
    }
    if (line.startsWith('> ')) {
      if (!current) {
        complaints.push(`line ${index + 1} gives a description before any page; without a page identity its cases have no reader.`)
        continue
      }
      current.description = line.slice(2)
      continue
    }
    const key = /^(out|index|source|order|level):\s*(.+)$/.exec(line)
    if (key) {
      if (!current) {
        complaints.push(`line ${index + 1} gives ${key[1]} before any page; the destination would have no page identity.`)
        continue
      }
      const value = key[2].trim()
      current[key[1]] = key[1] === 'order' || key[1] === 'level' ? Number(value) : value
      continue
    }
    if (line.startsWith('  ')) {
      if (!current) {
        complaints.push(`line ${index + 1} assigns a case before any page; a corpus case with no page has no reader.`)
        continue
      }
      const slug = line.slice(2).trim()
      if (seenSlugs.has(slug)) {
        complaints.push(`duplicate entry "${slug}" in the page file; one corpus pair cannot have two reading locations.`)
        continue
      }
      seenSlugs.add(slug)
      current.slugs.push(slug)
      continue
    }
    complaints.push(`line ${index + 1} has invalid page syntax; ignoring it could leave a corpus case on no page with no reader.`)
  }
  for (const page of pages) {
    if (!page.description) complaints.push(`page "${page.id}" has no description; its generated page would give readers no topical context.`)
    if (!page.out) complaints.push(`page "${page.id}" has no out: path; its sections would have no generated reading location.`)
    else if (!page.out.endsWith('.md')) complaints.push(`page "${page.id}" has out: "${page.out}" which does not end in .md; VitePress needs a Markdown page.`)
    if (!Number.isInteger(page.order)) complaints.push(`page "${page.id}" has a non-integer order; block ordering must be deterministic.`)
    if (![2, 3].includes(page.level)) complaints.push(`page "${page.id}" has level: "${page.level}"; section headings can only be level 2 or 3.`)
  }
  return { pages, complaints }
}

/* The three things a reader must be told to switch on before an optional
 * example applies. A fourth value would generate a page that describes no
 * activation the docs explain anywhere. */
const optionalKinds = new Set(['extensions-enable', 'core-configured', 'processor-options'])

export const parseOptionalPages = (source) => {
  const pages = []
  const complaints = []
  let current = null
  for (const [index, line] of source.split('\n').entries()) {
    if (line.trim() === '' || line.startsWith('#')) continue
    const heading = pageHeading.exec(line)
    if (heading) {
      current = { id: heading[1], title: heading[2], description: null, kind: null, out: null, order: 0, features: [], line: index + 1 }
      pages.push(current)
      continue
    }
    if (!current) {
      complaints.push(`optional page line ${index + 1} has content before a page; a pinned behavior would have no reader.`)
      continue
    }
    /*
     * ONE regex, matched once. Testing `^(kind|out|order):` and then execing a
     * second pattern that also requires a value made `kind:` with nothing after
     * it a TypeError at module scope instead of a complaint naming the line.
     */
    const key = /^(kind|out|order):\s*(.+)$/.exec(line)
    if (line.startsWith('> ')) current.description = line.slice(2)
    else if (key) current[key[1]] = key[1] === 'order' ? Number(key[2]) : key[2]
    else if (line.startsWith('  ')) current.features.push(line.trim())
    else complaints.push(`optional page line ${index + 1} has invalid syntax; ignoring it could leave a pinned behavior with no reader.`)
  }
  for (const page of pages) {
    if (!page.description || !page.out || !optionalKinds.has(page.kind)) complaints.push(`optional page "${page.id}" needs a description, out, and classified kind; readers must know what activates it.`)
    if (!Number.isInteger(page.order)) complaints.push(`optional page "${page.id}" has a non-integer order; block ordering must be deterministic.`)
  }
  return { pages, complaints }
}

/*
 * Sections whose heading would not survive being generated.
 *
 * `scripts/generate-example-pages.mjs` re-emits a section heading at the page's
 * own level by slicing off the two `#`s and keeping the rest verbatim, so the
 * character between `##` and the title travels into the generated page.
 * `scanExampleSource` opens a section on `/^##\s+/`, and `\s` is not only the
 * space. Two different things go wrong, which is why the rule is the space and
 * not "ATX whitespace". Measured through VitePress's own renderer:
 *
 *     "## Title"       ->  <h2 id="title">Title</h2>
 *     "##<TAB>Title"   ->  <h2 id="title">Title</h2>
 *     "##<U+00A0>Title" ->  <p>## Title</p>
 *
 * U+00A0 (and U+000B, U+000C) is not ATX whitespace, so the generated line
 * renders as a PARAGRAPH: a section that quietly stops being a heading, loses
 * the anchor every in-page link to it needs, and still owns its corpus
 * fixtures. A tab does render as a heading - but the generator pushes a shared
 * output's non-owner blocks down a level by matching
 * `SECTION_HEADING_PREFIX` literally, so a tab-separated heading would sit at
 * level 2 among page-mates that all moved to level 3. Both sides use the
 * constant below so the guard and that rewrite cannot drift apart.
 *
 * The LEVEL needs no check. `/^##\s/` is the only way a section opens, so a
 * `###` line is never a section heading and can never reach `bodyLines[0]`;
 * the generator carried a `startsWith('### ')` clause that therefore could not
 * fire and implied a guard that does not exist (carve#1496).
 */
export const SECTION_HEADING_PREFIX = '## '
export const nonHeadingSections = (sections, context) =>
  sections
    .filter((section) => !section.bodyLines[0].startsWith(SECTION_HEADING_PREFIX))
    .map((section) => {
      const heading = section.bodyLines[0]
      /* Name the CODE POINT. Every character this can report is invisible in a
       * terminal, so a message that only quotes the line shows the reader a
       * heading that looks perfectly correct. `##` plus one character is the
       * shortest heading the scanner can open a section on, so index 2 exists. */
      const separator = `U+${heading.codePointAt(2).toString(16).toUpperCase().padStart(4, '0')}`
      return `${context} heading "${heading}" separates "##" from its title with ${separator} instead of a space; the separator is re-emitted verbatim, and only a space is read as a heading by VitePress AND recognized by the rewrite that pushes a shared page's sections to level 3.`
    })

/*
 * The sections a page entry may name, keyed by slug, and the corpus pairs those
 * sections hold, keyed by fixture name. Numbering comes from the CONCATENATION
 * of the three example files - that is what `generate-corpus.mjs` numbers by -
 * while `sourceName` comes from the file a section actually sits in, so a page
 * can name its provenance. Both are needed to resolve a route, which is why
 * they are built together here rather than reconstructed on each side.
 */
export const collectSections = (repoRoot) => {
  const complaints = []
  const combinedScan = scanExampleSource(readExampleFiles(repoRoot).split('\n'))
  numberExamples(combinedScan)
  const numberedBySlug = new Map(combinedScan.sections.map((section) => [section.slug, section]))
  const sectionsBySlug = new Map()
  for (const sourceName of exampleFiles) {
    const sourcePath = resolve(repoRoot, 'resources/examples', `${sourceName}.md`)
    const { sections } = scanExampleSource(readFileSync(sourcePath, 'utf8').split('\n'))
    for (const section of sections) {
      /* `scanExampleSource` already throws on two identical section TITLES.
       * Two DIFFERENT titles that slugify to one slug reach here instead, and
       * a page entry naming that slug could not say which one it meant. */
      if (sectionsBySlug.has(section.slug)) {
        complaints.push(`source slug "${section.slug}" is duplicated; a page entry could not identify exactly one section.`)
        continue
      }
      const numbered = numberedBySlug.get(section.slug)
      for (let i = 0; i < section.segments.length; i++) {
        section.segments[i].corpusName = numbered?.segments[i]?.corpusName
      }
      sectionsBySlug.set(section.slug, { ...section, sourceName })
    }
  }
  const segmentsByName = new Map([...sectionsBySlug.values()].flatMap((section) =>
    section.segments.map((segment) => [segment.corpusName, { section, segment }])))
  return { sectionsBySlug, segmentsByName, complaints }
}

/*
 * Resolve every page entry to the corpus pairs it routes, and report the ways
 * that resolution can be ambiguous. Ambiguity is the whole point of this pass:
 * a manifest with two apparently authoritative reading locations for one rule
 * still generates two readable pages, so nothing downstream notices.
 */
export const routePages = ({ pages, sectionsBySlug, segmentsByName }) => {
  const complaints = []
  const routedSegments = new Map()
  const allEntries = new Set(pages.flatMap((page) => page.slugs))
  for (const entry of allEntries) {
    const fixture = segmentsByName.get(entry)
    /* A whole-section route already includes every fixture in that section.
     * Also naming one fixture obscures whether the author meant an override or
     * duplication, so reject that ambiguity even when the names are on pages. */
    if (fixture && allEntries.has(fixture.section.slug)) complaints.push(`the page file names both section "${fixture.section.slug}" and fixture "${entry}" from that section; the intent for section "${fixture.section.slug}" is ambiguous.`)
  }
  for (const page of pages) {
    const sectionEntries = new Set(page.slugs.filter((entry) => sectionsBySlug.has(entry)))
    for (const entry of page.slugs) {
      const fixture = segmentsByName.get(entry)
      /* A misspelled fixture otherwise disappears from the output while looking
       * like a deliberate fine-grained route in review. */
      if (!sectionsBySlug.has(entry) && !fixture) {
        complaints.push(`page-file entry "${entry}" matches no source section or fixture; readers would be sent to a pair that does not exist.`)
        continue
      }
      if (fixture && sectionEntries.has(fixture.section.slug)) {
        /* Naming a category and one of its fixtures makes it impossible to tell
         * whether duplication was deliberate. Reject it before one rule gains
         * two apparently authoritative reading locations. */
        complaints.push(`page "${page.id}" names both section "${fixture.section.slug}" and fixture "${entry}" from that section; the intent for section "${fixture.section.slug}" is ambiguous.`)
      }
      const selected = sectionsBySlug.has(entry) ? sectionsBySlug.get(entry).segments : [fixture.segment]
      for (const segment of selected) {
        /* Two destinations let surrounding prose turn one corpus pair into two
         * different apparent rules, so ownership must remain singular. */
        if (routedSegments.has(segment.corpusName)) {
          complaints.push(`fixture "${segment.corpusName}" is routed to both page "${routedSegments.get(segment.corpusName)}" and page "${page.id}"; it would read as two different rules.`)
          continue
        }
        routedSegments.set(segment.corpusName, page.id)
      }
    }
  }
  return { routedSegments, complaints }
}

/*
 * The other direction, kept separate because the suite already asks it of the
 * TRACKED fixtures - `git ls-files tests/corpus` - which is the population a
 * contributor actually commits. The generator asks it of the scanner's own
 * account, and `tests/no-orphan-pages.test.mjs` pins that the two agree.
 */
export const unroutedFixtures = ({ routedSegments, segmentsByName }) =>
  [...segmentsByName.keys()]
    .filter((fixture) => !routedSegments.has(fixture))
    .map((fixture) => `fixture "${fixture}" is routed to no page; this corpus fixture would have no reader.`)

/* A page may name a hand-written source instead of, or alongside, corpus
 * sections. Only `examples-tier3.md` does today, and only because
 * `tests/examples-tier3.test.mjs` happens to read that one file at module
 * scope were these two claims reachable at all. */
export const scanPageSources = (pages, repoRoot) => {
  const complaints = []
  /* Keyed by the PAGE OBJECT, not by `page.id`. Nothing rejects two entries
   * sharing an id - `out:` is what decides where a page lands - so an id key
   * would hand both of them the last one's sections. */
  const sectionsByPage = new Map()
  for (const page of pages.filter((candidate) => candidate.source)) {
    const sourcePath = resolve(repoRoot, 'resources', page.source)
    if (!existsSync(sourcePath)) {
      complaints.push(`page "${page.id}" names missing source "${page.source}"; its examples could not be generated.`)
      continue
    }
    const scan = scanExampleSource(readFileSync(sourcePath, 'utf8').split('\n'))
    if (scan.sections.length === 0) {
      complaints.push(`page "${page.id}" source has no sections; its generated page would be empty.`)
      continue
    }
    sectionsByPage.set(page, scan.sections)
  }
  return { sectionsByPage, complaints }
}

/*
 * A header-only block can own shared frontmatter and introductory prose,
 * including when its companions come from the optional-page file. An unshared
 * empty page would publish no examples at all.
 */
export const headerOnlyPages = (pages, optionalPages) => {
  const outputCounts = new Map()
  for (const entry of [...pages, ...optionalPages]) outputCounts.set(entry.out, (outputCounts.get(entry.out) ?? 0) + 1)
  return pages
    .filter((page) => page.slugs.length === 0 && !page.source && outputCounts.get(page.out) === 1)
    .map((page) => `page "${page.id}" has zero slugs and no source; that is allowed only when another entry shares its out: path as a legitimate header-only owner.`)
}

/*
 * The fence language an optional case's expected output is shown in, keyed by
 * TARGET - the same key `scripts/lib/corpus-targets.mjs` names its extensions
 * by, so one target vocabulary serves both halves of a generated comparison.
 *
 * WHY KEYED BY TARGET. The generator used to derive the extension from a closed
 * four-arm ternary (`markdown` -> .md, `plain` -> .txt, `ansi` -> .ansi,
 * ANYTHING ELSE -> .html) and then look the language up by extension. That made
 * the language lookup unable to miss - a `fail()` call that could not fire -
 * while the arm that actually mattered was the silent default: `carve` has been
 * a legal target with a `.fmt` expected file, honored by
 * `tests/optional-corpus.test.mjs`, `tests/corpus-targets.test.mjs` and
 * `scripts/compare-impls.mjs`, and the ternary called it HTML. Measured: with
 * one manifest case switched to `target: "carve"`, the old generator did not
 * fail at all - it paired the case with the `.html` file it also happens to have
 * and labeled the fence `html`, publishing an HTML expectation for a case pinned
 * on Carve output. Where no `.html` exists it failed one step later naming the
 * wrong file (carve#1496).
 *
 * Now an unknown target is caught by the extension map, which CAN miss, and a
 * target added to `TARGET_EXTENSIONS` with no fence language is caught here.
 * `tests/no-orphan-pages.test.mjs` asserts both directions of this map, the
 * shape carve#1490 gave `optional-feature-titles.mjs`.
 */
export const fenceLanguages = new Map([
  ['html', 'html'],
  ['markdown', 'markdown'],
  ['plain', 'text'],
  ['ansi', 'ansi'],
  ['carve', 'carve'],
])

/*
 * Resolve every optional-corpus case to the expected-file extension and fence
 * language its generated comparison needs.
 *
 * Keyed by the CASE OBJECT, not by `item.slug`. Nothing in this repo rejects
 * two manifest entries sharing a slug, and a slug key would hand both of them
 * the last one's target - the same keying trap `scanPageSources` documents.
 */
export const optionalCaseFences = (cases) => {
  const fences = new Map()
  const complaints = []
  for (const item of cases) {
    const target = targetOf(item)
    const extension = TARGET_EXTENSIONS[target]
    if (!extension) {
      complaints.push(`optional case "${item.slug}" names target "${target}", which is not one of ${targetNames().join(', ')}; its expected output has no filename, so the generated comparison would pin nothing.`)
      continue
    }
    const language = fenceLanguages.get(target)
    if (!language) {
      complaints.push(`optional case "${item.slug}" names target "${target}", which has no fence language in scripts/lib/example-page-manifest.mjs; the generator cannot label its expected output truthfully.`)
      continue
    }
    fences.set(item, { extension: `.${extension}`, language })
  }
  return { fences, complaints }
}
