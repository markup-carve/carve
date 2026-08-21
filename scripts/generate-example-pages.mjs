#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { slugify } from './lib/example-sections.mjs'
import { SECTION_HEADING_PREFIX, collectSections, headerOnlyPages, nonHeadingSections, optionalCaseFences, parseOptionalPages, parsePages, routePages, scanPageSources, unroutedFixtures } from './lib/example-page-manifest.mjs'
import { optionalFeatureTitles } from './lib/optional-feature-titles.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const pagesSource = resolve(repoRoot, 'resources/example-pages.txt')
const optionalPagesSource = resolve(repoRoot, 'resources/optional-example-pages.txt')
const optionalCorpusDir = resolve(repoRoot, 'tests/corpus-optional')
const outDir = resolve(repoRoot, 'docs/examples')
const sidebarFile = resolve(repoRoot, 'docs/.vitepress/generated-examples.json')

const fail = (message) => {
  console.error(`generate-example-pages: ${message}`)
  process.exit(1)
}

/* Every structural claim about the two manifests now lives in
 * scripts/lib/example-page-manifest.mjs so tests/no-orphan-pages.test.mjs can
 * make it too; this script keeps failing on the first complaint, as it did
 * when the checks were written out here (carve#1492). */
const failOn = (complaints) => {
  if (complaints.length > 0) fail(complaints[0])
}

/*
 * Relative prose links originally resolved from the source pages' old
 * /examples/ directory. Emitting an absolute site path preserves that meaning
 * for every generated output, regardless of how deeply its out: path sits.
 *
 * PROSE ONLY. The same byte sequence inside a `::: compare` block is fixture
 * content, so rewriting there would make the docs differ from the corpus.
 */
const sourceDir = '/examples/'
const absolutize = (dest) => {
  const parts = sourceDir.split('/').filter(Boolean)
  for (const part of dest.split('/')) {
    if (part === '.' || part === '') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return `/${parts.join('/')}`
}
const rewriteProseLinks = (lines) => {
  const out = []
  let compareMarker = null
  for (const line of lines) {
    if (compareMarker === null && /^:{3,}\s+compare(\s+\S.*)?$/.test(line.trim())) {
      compareMarker = line.trim().match(/^(:{3,})/)[1]
      out.push(line)
      continue
    }
    if (compareMarker !== null) {
      if (line.trim() === compareMarker) compareMarker = null
      out.push(line)
      continue
    }
    out.push(line.replace(/\]\((\.{1,2}\/[^)\s]*)\)/g, (_, dest) => `](${absolutize(dest)})`))
  }
  return out
}

/* VitePress derives heading ids with the same slug rule. */
const githubAnchor = (title) => slugify(title)

/*
 * Manifest descriptions name HTML elements in running prose ("no <section> is
 * emitted", "render as <b class="callout"> bubbles"). VitePress compiles a page
 * as a Vue template, so a raw `<section>` in prose is an element with no end
 * tag and the whole build fails with "Element is missing end tag" - which is
 * exactly what it did. Escaping is safe here because these descriptions carry
 * no intentional markup, only element names being talked about.
 */
const asProse = (text) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
const { sectionsBySlug, segmentsByName, complaints: sectionComplaints } = collectSections(repoRoot)
failOn(sectionComplaints)

const { pages, complaints: pageComplaints } = parsePages(readFileSync(pagesSource, 'utf8'))
failOn(pageComplaints)
const { routedSegments, complaints: routeComplaints } = routePages({ pages, sectionsBySlug, segmentsByName })
failOn(routeComplaints)
/* A generated corpus pair without documentation has no reader, which is the
 * invariant this routing manifest exists to enforce at pair granularity. */
failOn(unroutedFixtures({ routedSegments, segmentsByName }))

const { sectionsByPage, complaints: sourceComplaints } = scanPageSources(pages, repoRoot)
failOn(sourceComplaints)
for (const page of pages) page.standaloneSections = sectionsByPage.get(page)

/* Asked of both populations that reach `sectionLines` below, before anything is
 * generated: the scanner guarantees a section opens at `##`, not what separates
 * it from the title, and the separator is re-emitted verbatim (carve#1496). */
failOn(nonHeadingSections([...sectionsBySlug.values()], 'resources/examples/*.md'))
for (const [page, sections] of sectionsByPage) failOn(nonHeadingSections(sections, `page "${page.id}" source resources/${page.source}`))

const corpusUrl = (name) => `https://github.com/markup-carve/carve/blob/main/tests/corpus/${name}.crv`
const sourceLink = (name) => `[\`resources/examples/${name}.md\`](https://github.com/markup-carve/carve/blob/main/resources/examples/${name}.md)`
/*
 * ONE banner per page, not one per section. A page draws its sections from
 * whichever source files hold them - the Core page pulls from two - so the
 * banner names every source it used. Repeating it above all 45 sections of a
 * page buries the cases it is supposed to introduce.
 */
const banner = (sourceNames) => {
  const links = [...sourceNames].map(sourceLink)
  const list = links.length === 1 ? links[0] : `${links.slice(0, -1).join(', ')} and ${links.at(-1)}`
  return `Generated from ${list} - edit the cases there, not here. Each case links the conformance fixture it produces.`
}
/*
 * Re-emitting the heading at the page's level is a slice, not a reparse: the two
 * `#`s go, everything after them travels verbatim. Both claims that used to be
 * checked here are settled before this point (carve#1496). `scanExampleSource`
 * opens a section only on `/^##\s+/`, so `bodyLines[0]` exists and begins at
 * level 2 - a `###` line never opens a section, which is why the `### ` clause
 * that lived here could not fire. What the separator may be is not guaranteed by
 * that regex, so `nonHeadingSections` in scripts/lib/example-page-manifest.mjs
 * asks it of both populations above, where a test can ask it too.
 */
const sectionLines = (section, level) => {
  const [heading, ...body] = rewriteProseLinks(section.bodyLines)
  return [`${'#'.repeat(level)}${heading.slice(2)}`, ...body]
}
const sectionHeading = (section, level) => sectionLines({ bodyLines: [section.bodyLines[0]] }, level)[0]
const segmentLines = (segment) => rewriteProseLinks(segment.bodyLines)
const blocksByOutput = new Map()
let declarationIndex = 0
const addBlock = (out, block) => {
  if (!blocksByOutput.has(out)) blocksByOutput.set(out, [])
  blocksByOutput.get(out).push({ ...block, declarationIndex: declarationIndex++ })
}
for (const page of pages) {
  const lines = []
  const selectedSections = page.slugs.map((entry) => sectionsBySlug.get(entry) ?? segmentsByName.get(entry).section)
  const sourceNames = new Set(selectedSections.map((section) => section.sourceName))
  if (sourceNames.size > 0) lines.push(banner(sourceNames), '')
  /*
   * Group by section BEFORE emitting. A per-fixture route makes each pair its
   * own page entry, so a section's pairs arrive as several entries and its
   * fixture names have to be collected before the heading is written.
   */
  const bySection = new Map()
  for (const entry of page.slugs) {
    const section = sectionsBySlug.get(entry) ?? segmentsByName.get(entry).section
    const segments = sectionsBySlug.has(entry) ? section.segments : [segmentsByName.get(entry).segment]
    if (!bySection.has(section.slug)) bySection.set(section.slug, { section, segments: [] })
    bySection.get(section.slug).segments.push(...segments)
  }
  for (const { section, segments } of bySection.values()) {
    lines.push(sectionHeading(section, page.level))
    /*
     * ONE collapsed list per section, not a citation line per pair. The
     * fixture name serves one flow - a maintainer asking which fixture pins a
     * broken example - and paying a line of GitHub URL per pair for it put
     * 973 lines of filenames across the site, in the worst possible position:
     * between the prose introducing an example and the example itself.
     */
    const fixtures = segments.map((segment) => segment.corpusName).filter(Boolean)
    if (fixtures.length) {
      lines.push(
        '',
        `::: details ${fixtures.length} conformance fixture${fixtures.length === 1 ? '' : 's'}`,
        '',
        ...fixtures.map((name) => `- [\`${name}\`](${corpusUrl(name)})`),
        '',
        ':::',
      )
    }
    for (const segment of segments) {
      const body = segmentLines(segment)
      while (body[0] === '') body.shift()
      /* A segment already carries its own leading blank, so only add a
       * separator when the previous line is not one. Doing this on the
       * separator alone keeps blank lines inside fences untouched - those are
       * fixture content. */
      if (lines.at(-1) !== '') lines.push('')
      lines.push(...body)
    }
  }
  if (page.source) {
    lines.push(`Hand-written source: [\`resources/${page.source}\`](https://github.com/markup-carve/carve/blob/main/resources/${page.source}).`, '')
    for (const section of page.standaloneSections) lines.push(...sectionLines(section, page.level))
  }
  addBlock(page.out, { order: page.order, title: page.title, description: page.description, lines })
}


/*
 * The authored headings live in scripts/lib/optional-feature-titles.mjs so
 * that tests/no-orphan-pages.test.mjs can assert both directions of the map.
 * They used to sit here, where only docs:pages/docs:dev/docs:build reached
 * them, so a feature added without a title passed npm test and failed in a
 * later job (carve#1490).
 */
const featureTitle = (feature) => {
  const title = optionalFeatureTitles.get(feature)
  if (!title) fail(`manifest feature "${feature}" has no authored title in scripts/lib/optional-feature-titles.mjs; a slug-cased heading reads as a filename, not a feature.`)
  return title
}
const fenced = (language, content) => {
  const longest = Math.max(0, ...[...content.matchAll(/`+/g)].map((match) => match[0].length))
  const marker = '`'.repeat(Math.max(3, longest + 1))
  return [marker + language, content, marker]
}
const manifest = JSON.parse(readFileSync(resolve(optionalCorpusDir, 'manifest.json'), 'utf8'))
const casesByFeature = new Map()
for (const item of manifest.cases) {
  if (!casesByFeature.has(item.feature)) casesByFeature.set(item.feature, [])
  casesByFeature.get(item.feature).push(item)
}
/* The expected-output extension and its fence language both come from the
 * case's `target`, through the map every other reader of this manifest uses.
 * Resolved for the whole manifest up front so a target nobody implements is
 * named as such, rather than defaulting to HTML - which pinned the wrong file
 * silently wherever an `.html` happened to exist (carve#1496). */
const { fences, complaints: fenceComplaints } = optionalCaseFences(manifest.cases)
failOn(fenceComplaints)
const { pages: optionalPages, complaints: optionalComplaints } = parseOptionalPages(readFileSync(optionalPagesSource, 'utf8'))
failOn(optionalComplaints)
failOn(headerOnlyPages(pages, optionalPages))
const optionalAssigned = new Set(optionalPages.flatMap((page) => page.features))
for (const feature of casesByFeature.keys()) {
  if (!optionalAssigned.has(feature)) fail(`manifest feature "${feature}" appears on no optional page; this pinned behavior has no reader.`)
}
for (const feature of optionalAssigned) {
  if (!casesByFeature.has(feature)) fail(`optional page names feature "${feature}" which is not in the manifest; readers would see a nonexistent behavior.`)
}
for (const page of optionalPages) {
  const lines = []
  for (const feature of page.features) {
    const featureCases = casesByFeature.get(feature)
    lines.push(`## ${featureTitle(feature)}`, '', asProse(featureCases[0].description), '')
    const fixtureLinks = featureCases.map(({ slug }) => `[\`${slug}.crv\`](https://github.com/markup-carve/carve/blob/main/tests/corpus-optional/${slug}.crv)`)
    /*
     * The fixture list is provenance, not content: Citations alone carries 16
     * of them, which puts a paragraph of filenames between the reader and the
     * first example. Collapse it so the page opens on the examples and the
     * fixture names stay one click away for whoever is checking conformance.
     */
    lines.push(
      `::: details ${fixtureLinks.length} conformance fixture${fixtureLinks.length === 1 ? '' : 's'} in \`tests/corpus-optional\``,
      '',
      `Pinned when this feature is enabled - not part of the mandatory corpus.`,
      '',
      ...fixtureLinks.map((link) => `- ${link}`),
      '',
      ':::',
      '',
    )
    for (const item of featureCases) {
      const sourcePath = resolve(optionalCorpusDir, `${item.slug}.crv`)
      const { extension: targetExtension, language } = fences.get(item)
      const targetPath = resolve(optionalCorpusDir, `${item.slug}${targetExtension}`)
      if (!existsSync(sourcePath) || !existsSync(targetPath)) fail(`optional case "${item.slug}" is missing its .crv or ${targetExtension} target; the generated comparison would be unverifiable.`)
      /* These renders depend on configuration the docs page does not apply; live rendering would contradict the pinned output. */
      const carve = readFileSync(sourcePath, 'utf8').replace(/\n$/, '')
      const target = readFileSync(targetPath, 'utf8').replace(/\n$/, '')
      lines.push(':::: compare no-render', '', ...fenced('carve', carve), '', ...fenced(language, target), '', '::::', '')
    }
  }
  addBlock(page.out, { order: page.order, title: page.title, description: page.description, lines })
}

/* Generated outputs are replaced as a unit so removed pages cannot linger. */
if (existsSync(outDir)) rmSync(outDir, { recursive: true })
mkdirSync(outDir, { recursive: true })
for (const [out, blocks] of blocksByOutput) {
  blocks.sort((a, b) => a.order - b.order || a.declarationIndex - b.declarationIndex)
  const owner = blocks[0]
  const parts = [
    '---',
    `title: ${JSON.stringify(owner.title)}`,
    `description: ${JSON.stringify(owner.description)}`,
    'editLink: false',
    '---',
    '',
    `# ${owner.title}`,
    '',
    owner.description,
    '',
  ]
  for (const block of blocks) {
    /* A page with one block is that block: repeating its title under the H1
     * gives the reader a heading that says nothing new. Shared outputs need a
     * group boundary for every non-owner block, including a header-only owner. */
    if (blocks.length > 1 && block !== owner) parts.push(`## ${block.title}`, '', asProse(block.description), '')
    const nested = blocks.length > 1 && block !== owner
      /* Same prefix `nonHeadingSections` guards, imported rather than respelled:
       * a heading it let through with a different separator would silently stay
       * at level 2 while its page-mates moved to level 3 (carve#1496). */
      ? block.lines.map((line) => line.startsWith(SECTION_HEADING_PREFIX) ? `###${line.slice(2)}` : line)
      : block.lines
    parts.push(...nested)
  }
  const destination = resolve(repoRoot, 'docs', out)
  mkdirSync(dirname(destination), { recursive: true })
  writeFileSync(destination, parts.join('\n').replace(/\n*$/, '\n'))
}

const indexes = new Map()
for (const page of pages) {
  if (!page.index) continue
  if (!indexes.has(page.index)) indexes.set(page.index, [])
  indexes.get(page.index).push(page)
}
for (const [indexPath, indexedPages] of indexes) {
  const index = [
    '---',
    'title: "Examples: Edge Cases"',
    'description: "Topical guides to the edge cases that double as Carve conformance fixtures."',
    'editLink: false',
    '---',
    '',
    '# Examples: Edge Cases',
    '',
    'These edge cases are executable conformance fixtures, organized into topical pages for easier reading.',
    '',
  ]
  for (const page of indexedPages) {
    index.push(`### ${page.title}`, '', page.description, '')
    const pageLink = posix.relative(posix.dirname(indexPath), page.out).replace(/\.md$/, '')
    const indexedSections = new Map(page.slugs.map((entry) => {
      const section = sectionsBySlug.get(entry) ?? segmentsByName.get(entry).section
      return [section.slug, section]
    }))
    for (const section of indexedSections.values()) {
      index.push(`- [${section.title}](./${pageLink}#${githubAnchor(section.title)})`)
    }
    index.push('')
  }
  const destination = resolve(repoRoot, 'docs', indexPath)
  mkdirSync(dirname(destination), { recursive: true })
  writeFileSync(destination, index.join('\n'))
}

const edgeIndex = 'examples/edge-cases/index.md'
const sidebar = {
  edgeCases: (indexes.get(edgeIndex) ?? []).map((page) => ({
    text: page.title,
    link: `/${page.out.replace(/\.md$/, '')}`,
  })),
}
writeFileSync(sidebarFile, JSON.stringify(sidebar, null, 2) + '\n')
const generatedOutputs = new Set([...blocksByOutput.keys(), ...indexes.keys()])
console.log(`Generated ${generatedOutputs.size} example pages (${pages.length} configured topical entries plus ${indexes.size} index).`)
