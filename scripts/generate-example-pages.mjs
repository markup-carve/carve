#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exampleFiles, numberExamples, readExampleFiles, scanExampleSource, slugify } from './lib/example-sections.mjs'

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

const parsePages = (source) => {
  const pages = []
  const seenSlugs = new Set()
  let current = null
  for (const [index, line] of source.split('\n').entries()) {
    if (line.trim() === '' || line.startsWith('#')) continue
    const heading = /^\[([^\]]+)\]\s+(.+)$/.exec(line)
    if (heading) {
      current = { id: heading[1], title: heading[2], description: null, out: null, index: null, source: null, order: 0, level: 2, slugs: [] }
      pages.push(current)
      continue
    }
    if (line.startsWith('> ')) {
      if (!current) fail(`line ${index + 1} gives a description before any page; without a page identity its cases have no reader.`)
      current.description = line.slice(2)
      continue
    }
    const key = /^(out|index|source|order|level):\s*(.+)$/.exec(line)
    if (key) {
      if (!current) fail(`line ${index + 1} gives ${key[1]} before any page; the destination would have no page identity.`)
      const value = key[2].trim()
      current[key[1]] = key[1] === 'order' || key[1] === 'level' ? Number(value) : value
      continue
    }
    if (line.startsWith('  ')) {
      if (!current) fail(`line ${index + 1} assigns a case before any page; a corpus case with no page has no reader.`)
      const slug = line.slice(2).trim()
      if (seenSlugs.has(slug)) fail(`duplicate entry "${slug}" in the page file; one corpus pair cannot have two reading locations.`)
      seenSlugs.add(slug)
      current.slugs.push(slug)
      continue
    }
    fail(`line ${index + 1} has invalid page syntax; ignoring it could leave a corpus case on no page with no reader.`)
  }
  for (const page of pages) {
    if (!page.description) fail(`page "${page.id}" has no description; its generated page would give readers no topical context.`)
    if (!page.out) fail(`page "${page.id}" has no out: path; its sections would have no generated reading location.`)
    if (!page.out.endsWith('.md')) fail(`page "${page.id}" has out: "${page.out}" which does not end in .md; VitePress needs a Markdown page.`)
    if (!Number.isInteger(page.order)) fail(`page "${page.id}" has a non-integer order; block ordering must be deterministic.`)
    if (![2, 3].includes(page.level)) fail(`page "${page.id}" has level: "${page.level}"; section headings can only be level 2 or 3.`)
  }
  return pages
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
const combinedScan = scanExampleSource(readExampleFiles(repoRoot).split('\n'))
numberExamples(combinedScan)
const numberedBySlug = new Map(combinedScan.sections.map((section) => [section.slug, section]))
const sectionsBySlug = new Map()
for (const sourceName of exampleFiles) {
  const sourcePath = resolve(repoRoot, 'resources/examples', `${sourceName}.md`)
  for (const section of scanExampleSource(readFileSync(sourcePath, 'utf8').split('\n')).sections) {
    if (sectionsBySlug.has(section.slug)) fail(`source slug "${section.slug}" is duplicated; a page entry could not identify exactly one section.`)
    const numbered = numberedBySlug.get(section.slug)
    for (let i = 0; i < section.segments.length; i++) {
      section.segments[i].corpusName = numbered?.segments[i]?.corpusName
    }
    sectionsBySlug.set(section.slug, { ...section, sourceName })
  }
}

const pages = parsePages(readFileSync(pagesSource, 'utf8'))
const segmentsByName = new Map([...sectionsBySlug.values()].flatMap((section) =>
  section.segments.map((segment) => [segment.corpusName, { section, segment }])))
const routedSegments = new Map()
const allEntries = new Set(pages.flatMap((page) => page.slugs))
for (const entry of allEntries) {
  const fixture = segmentsByName.get(entry)
  /* A whole-section route already includes every fixture in that section.
   * Also naming one fixture obscures whether the author meant an override or
   * duplication, so reject that ambiguity even when the names are on pages. */
  if (fixture && allEntries.has(fixture.section.slug)) fail(`the page file names both section "${fixture.section.slug}" and fixture "${entry}" from that section; the intent for section "${fixture.section.slug}" is ambiguous.`)
}
for (const page of pages) {
  const sectionEntries = new Set(page.slugs.filter((entry) => sectionsBySlug.has(entry)))
  for (const entry of page.slugs) {
    const fixture = segmentsByName.get(entry)
    /* A misspelled fixture otherwise disappears from the output while looking
     * like a deliberate fine-grained route in review. */
    if (!sectionsBySlug.has(entry) && !fixture) fail(`page-file entry "${entry}" matches no source section or fixture; readers would be sent to a pair that does not exist.`)
    if (fixture && sectionEntries.has(fixture.section.slug)) {
      /* Naming a category and one of its fixtures makes it impossible to tell
       * whether duplication was deliberate. Reject it before one rule gains
       * two apparently authoritative reading locations. */
      fail(`page "${page.id}" names both section "${fixture.section.slug}" and fixture "${entry}" from that section; the intent for section "${fixture.section.slug}" is ambiguous.`)
    }
    const selected = sectionsBySlug.has(entry) ? sectionsBySlug.get(entry).segments : [fixture.segment]
    for (const segment of selected) {
      /* Two destinations let surrounding prose turn one corpus pair into two
       * different apparent rules, so ownership must remain singular. */
      if (routedSegments.has(segment.corpusName)) fail(`fixture "${segment.corpusName}" is routed to both page "${routedSegments.get(segment.corpusName)}" and page "${page.id}"; it would read as two different rules.`)
      routedSegments.set(segment.corpusName, page.id)
    }
  }
}
for (const fixture of segmentsByName.keys()) {
  /* A generated corpus pair without documentation has no reader, which is the
   * invariant this routing manifest exists to enforce at pair granularity. */
  if (!routedSegments.has(fixture)) fail(`fixture "${fixture}" is routed to no page; this corpus fixture would have no reader.`)
}

for (const page of pages.filter((candidate) => candidate.source)) {
  const sourcePath = resolve(repoRoot, 'resources', page.source)
  if (!existsSync(sourcePath)) fail(`page "${page.id}" names missing source "${page.source}"; its examples could not be generated.`)
  const scan = scanExampleSource(readFileSync(sourcePath, 'utf8').split('\n'))
  if (scan.sections.length === 0) fail(`page "${page.id}" source has no sections; its generated page would be empty.`)
  page.standaloneSections = scan.sections
}

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
const sectionLines = (section, level, context) => {
  const [heading, ...body] = rewriteProseLinks(section.bodyLines)
  /* Generated nesting is only safe when the authored section starts at the
   * documented ## boundary; accepting another level would silently corrupt
   * both the outline and VitePress's stable anchor text. */
  if (!heading?.startsWith('## ') || heading.startsWith('### ')) fail(`${context} section heading "${heading ?? ''}" is not ##; generated sections must begin at level 2 before nesting.`)
  return [`${'#'.repeat(level)}${heading.slice(2)}`, ...body]
}
const sectionHeading = (section, level, context) => sectionLines({ bodyLines: [section.bodyLines[0]] }, level, context)[0]
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
  const headed = new Set()
  for (const entry of page.slugs) {
    const section = sectionsBySlug.get(entry) ?? segmentsByName.get(entry).section
    const segments = sectionsBySlug.has(entry) ? section.segments : [segmentsByName.get(entry).segment]
    if (!headed.has(section.slug)) {
      lines.push(sectionHeading(section, page.level, `page "${page.id}"`))
      headed.add(section.slug)
    }
    for (const segment of segments) {
      /*
       * A segment is the prose that introduces an example plus the example
       * itself. The fixture link belongs ON the example, so it goes directly
       * above the compare block - emitting it first puts a filename between
       * the heading and the sentence that explains what follows.
       */
      const body = segmentLines(segment)
      while (body[0] === '') body.shift()
      const compareAt = body.findIndex((line) => /^:{3,}\s+compare(\s+\S.*)?$/.test(line.trim()))
      const citation = `Corpus fixture: [\`${segment.corpusName}\`](${corpusUrl(segment.corpusName)})`
      /* A segment already carries its own leading blank, so only add a
       * separator when the previous line is not one. Doing this on the
       * separator alone keeps blank lines inside fences untouched - those are
       * fixture content. */
      if (lines.at(-1) !== '') lines.push('')
      lines.push(...(compareAt === -1
        ? [citation, ...body]
        : [...body.slice(0, compareAt), citation, '', ...body.slice(compareAt)]))
    }
  }
  if (page.source) {
    lines.push(`Hand-written source: [\`resources/${page.source}\`](https://github.com/markup-carve/carve/blob/main/resources/${page.source}).`, '')
    for (const section of page.standaloneSections) lines.push(...sectionLines(section, page.level, `page "${page.id}"`))
  }
  addBlock(page.out, { order: page.order, title: page.title, description: page.description, lines })
}


/*
 * Every manifest feature needs an authored heading. Title-casing the id
 * produces "Bare Url Autolink" and "Ansi Typography Source" - a slug wearing
 * capitals, not a name a reader recognizes. Making the map REQUIRED (see the
 * fail below) means a new manifest feature stops the build until someone names
 * it, instead of shipping the slug-cased fallback nobody would notice.
 */
const optionalTitle = new Map([
  ['citations-numbered', 'Citations, numbered'],
  ['citations-author-date', 'Citations, author-date'],
  ['code-callouts', 'CodeCallouts'],
  ['details', 'Details'],
  ['list-table', 'ListTable'],
  ['spoiler', 'Spoiler'],
  ['tabs', 'Tabs'],
  ['semantic-span', 'SemanticSpan'],
  ['social-link-templates', 'Mention and tag URL templates'],
  ['symbol-map', 'Symbol map'],
  ['smart-quotes-locale-de', 'Smart quotes (de locale)'],
  ['bare-url-autolink', 'Bare-URL autolinking'],
  ['smart-typography-off', 'Smart typography off'],
  ['smart-typography-default', 'Smart typography at default (control)'],
  ['section-wrapper-off', 'Section wrapper off'],
  ['source-line-after-generated-id', 'Source-line annotation order'],
  ['markdown-typography-source', 'Markdown target, source typography'],
  ['plain-typography-source', 'Plain-text target, source typography'],
  ['ansi-typography-source', 'ANSI target, source typography'],
])
const featureTitle = (feature) => {
  const title = optionalTitle.get(feature)
  if (!title) fail(`manifest feature "${feature}" has no authored title in optionalTitle; a slug-cased heading reads as a filename, not a feature.`)
  return title
}
const languageByExtension = new Map([
  ['.html', 'html'],
  ['.md', 'markdown'],
  ['.txt', 'text'],
  ['.ansi', 'ansi'],
])
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
const parseOptionalPages = (source) => {
  const parsed = []
  let current = null
  for (const [index, line] of source.split('\n').entries()) {
    if (line.trim() === '' || line.startsWith('#')) continue
    const heading = /^\[([^\]]+)\]\s+(.+)$/.exec(line)
    if (heading) {
      current = { id: heading[1], title: heading[2], description: null, kind: null, out: null, order: 0, features: [], line: index + 1 }
      parsed.push(current)
      continue
    }
    if (!current) fail(`optional page line ${index + 1} has content before a page; a pinned behavior would have no reader.`)
    if (line.startsWith('> ')) current.description = line.slice(2)
    else if (/^(kind|out|order):\s*/.test(line)) {
      const [, key, value] = /^(kind|out|order):\s*(.+)$/.exec(line)
      current[key] = key === 'order' ? Number(value) : value
    } else if (line.startsWith('  ')) current.features.push(line.trim())
    else fail(`optional page line ${index + 1} has invalid syntax; ignoring it could leave a pinned behavior with no reader.`)
  }
  const kinds = new Set(['extensions-enable', 'core-configured', 'processor-options'])
  for (let i = 0; i < parsed.length; i++) {
    const page = parsed[i]
    if (!page.description || !page.out || !kinds.has(page.kind)) fail(`optional page "${page.id}" needs a description, out, and classified kind; readers must know what activates it.`)
    if (!Number.isInteger(page.order)) fail(`optional page "${page.id}" has a non-integer order; block ordering must be deterministic.`)
  }
  return parsed
}
const optionalPages = parseOptionalPages(readFileSync(optionalPagesSource, 'utf8'))
const outputCounts = new Map()
for (const entry of [...pages, ...optionalPages]) outputCounts.set(entry.out, (outputCounts.get(entry.out) ?? 0) + 1)
for (const page of pages) {
  /* A header-only block can own shared frontmatter and introductory prose,
   * including when its companions come from the optional-page file. An
   * unshared empty page would publish no examples at all. */
  if (page.slugs.length === 0 && !page.source && outputCounts.get(page.out) === 1) fail(`page "${page.id}" has zero slugs and no source; that is allowed only when another entry shares its out: path as a legitimate header-only owner.`)
}
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
      const targetExtension = item.target === 'markdown' ? '.md' : item.target === 'plain' ? '.txt' : item.target === 'ansi' ? '.ansi' : '.html'
      const targetPath = resolve(optionalCorpusDir, `${item.slug}${targetExtension}`)
      if (!existsSync(sourcePath) || !existsSync(targetPath)) fail(`optional case "${item.slug}" is missing its .crv or ${targetExtension} target; the generated comparison would be unverifiable.`)
      const language = languageByExtension.get(targetExtension)
      if (!language) fail(`optional case "${item.slug}" has unknown target extension "${targetExtension}"; the generator cannot choose a truthful fence language.`)
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
      ? block.lines.map((line) => line.startsWith('## ') ? `###${line.slice(2)}` : line)
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
