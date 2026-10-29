import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/*
 * `core.md` and `extensions.md` number their sections by position and take no
 * new sections. Every other section is a file of its own,
 * `edge-cases/NNNN-slug.md`, numbered by its name: the number orders, the slug
 * identifies. Two PRs adding a section never touch the same file and never
 * renumber each other, even when both take the same number.
 */
export const positionalExampleFiles = ['core', 'extensions']
export const sectionDir = 'edge-cases'
export const sectionFileName = /^(\d{4,})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/

const byNumberThenName = (a, b) =>
  (a.number ?? Infinity) - (b.number ?? Infinity) || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0)

export const exampleSourceFiles = (repoRoot) => {
  const sectionFiles = readdirSync(resolve(repoRoot, 'resources/examples', sectionDir))
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .map((file) => {
      const match = sectionFileName.exec(file)
      return { name: `${sectionDir}/${file.slice(0, -3)}`, group: sectionDir, file, number: match ? Number(match[1]) : null, slug: match?.[2] ?? null }
    })
    .sort(byNumberThenName)
  return [
    ...positionalExampleFiles.map((name) => ({ name, group: name, file: `${name}.md`, number: null, slug: null })),
    ...sectionFiles,
  ].map((source) => ({ ...source, path: resolve(repoRoot, 'resources/examples', `${source.name}.md`) }))
}

/* Paths under resources/examples/ without `.md`, in reading order. */
export const exampleFiles = exampleSourceFiles(resolve(dirname(fileURLToPath(import.meta.url)), '../..'))
  .map((source) => source.name)

/*
 * A section file may open with front matter. Its one key, `page`, routes the
 * whole section to a page of resources/example-pages.txt without editing that
 * file. The front matter and the blank lines after it are not section content.
 */
export const frontMatterKeys = new Set(['page'])

export const readExampleSource = (path) => {
  const text = readFileSync(path, 'utf8')
  const lines = text.split('\n')
  const frontMatter = {}
  const complaints = []
  if (lines[0] !== '---') return { body: text, frontMatter, complaints }
  const end = lines.indexOf('---', 1)
  if (end === -1) return { body: text, frontMatter, complaints: ['its front matter is never closed by a `---` line'] }
  for (const line of lines.slice(1, end)) {
    const entry = /^([a-z][a-z-]*):\s*(\S.*?)\s*$/.exec(line)
    if (!entry) complaints.push(`front matter line "${line}" is not \`key: value\``)
    else if (!frontMatterKeys.has(entry[1])) complaints.push(`front matter key "${entry[1]}" is unknown (known: ${[...frontMatterKeys].join(', ')})`)
    else frontMatter[entry[1]] = entry[2]
  }
  let start = end + 1
  while (start < lines.length - 1 && lines[start].trim() === '') start++
  return { body: lines.slice(start).join('\n'), frontMatter, complaints }
}

export const readExampleFiles = (repoRoot) => exampleSourceFiles(repoRoot)
  .map((source) => readExampleSource(source.path).body)
  .join('\n')

/* Section title -> the number its file name declares; pass to numberExamples. */
export const exampleSectionNumbers = (repoRoot) => {
  const numbers = new Map()
  for (const source of exampleSourceFiles(repoRoot)) {
    if (source.number === null) continue
    const heading = /^##\s+(.+?)\s*$/m.exec(readExampleSource(source.path).body)
    if (heading) numbers.set(heading[1], source.number)
  }
  return numbers
}

/*
 * What makes a section file unreadable as one numbered section. The generator
 * fails on these and tests/example-section-files.test.mjs asserts none.
 */
export const exampleSourceComplaints = (repoRoot) => {
  const complaints = []
  const sources = exampleSourceFiles(repoRoot)
  const positionalSections = sources
    .filter((source) => source.number === null && source.group !== sectionDir)
    .reduce((count, source) => {
      const { examples } = scanExampleSource(readExampleSource(source.path).body.split('\n'))
      return count + new Set(examples.map((example) => example.section)).size
    }, 0)
  for (const source of sources.filter((candidate) => candidate.group === sectionDir)) {
    const where = `resources/examples/${source.file}`
    if (source.number === null) {
      complaints.push(`${where} is not named NNNN-slug.md; its section would have no number.`)
      continue
    }
    const { body, complaints: frontMatterComplaints } = readExampleSource(source.path)
    for (const complaint of frontMatterComplaints) complaints.push(`${where}: ${complaint}.`)
    const lines = body.split('\n')
    const { sections } = scanExampleSource(lines)
    if (!lines[0].startsWith('## ') || sections.length !== 1) {
      complaints.push(`${where} must hold exactly one section and start with its \`## \` heading; it holds ${sections.length}.`)
      continue
    }
    if (sections[0].slug !== source.slug) {
      complaints.push(`${where} holds section "${sections[0].title}", whose slug is "${sections[0].slug}"; the file name and the corpus name must agree.`)
    }
    if (source.number <= positionalSections) {
      complaints.push(`${where} takes number ${source.number}, which core.md and extensions.md already number by position (1 to ${positionalSections}).`)
    }
  }
  return complaints
}

/*
 * Section boundaries and corpus pairs must share this state machine. A heading
 * inside a compare fence is fixture content, not a new section; recognizing it
 * differently here would renumber the corpus or split a generated page.
 */
export const scanExampleSource = (lines, { validateModifiers = () => {} } = {}) => {
  const sections = []
  const examples = []
  const seenTitles = new Set()
  const dropped = []
  let currentSection = null
  let mode = 'scanning'
  let pendingBlocks = { carve: null, html: null }
  let currentLang = null
  let fenceMarker = null
  let compareMarker = null
  let compareOpenText = null
  let pairsInBlock = 0
  let compareModifiers = new Set()
  let blockLines = []
  let comparesOpened = 0
  let compareOpenLine = 0
  let segmentStartLine = 0

  const finalizePair = (endLine, atCloser = false) => {
    if (currentSection && pendingBlocks.carve && (pendingBlocks.html || (compareModifiers.has('no-final-newline') && pendingBlocks.html === ''))) {
      const example = {
        section: currentSection.title,
        carve: pendingBlocks.carve,
        html: pendingBlocks.html,
        modifiers: compareModifiers,
        modifierLine: compareOpenLine,
        compareLine: compareOpenLine,
      }
      examples.push(example)
      /*
       * A segment is emitted ON ITS OWN when a page routes one fixture, so it
       * has to be a complete `::: compare` container. Splitting a multi-pair
       * block at a fence cuts the container in half: the pair before the split
       * keeps the opener and loses the closer, the pair after keeps the closer
       * and loses the opener. Record which half is missing; the wrapper is
       * synthesized where bodyLines are cut, below.
       */
      currentSection.segments.push({
        startLine: segmentStartLine,
        endLine,
        example,
        needsOpener: pairsInBlock > 0,
        needsCloser: !atCloser,
        compareOpenText,
        compareCloseText: compareMarker,
      })
      pairsInBlock++
      segmentStartLine = endLine
    } else if (currentSection) {
      const miss = [!pendingBlocks.carve && 'carve', !pendingBlocks.html && 'html']
        .filter(Boolean)
        .join(' + ')
      dropped.push(`line ${compareOpenLine} (section "${currentSection.title}"): missing ${miss} fence`)
    }
    pendingBlocks = { carve: null, html: null }
  }

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const h2 = line.match(/^##\s+(.+?)\s*$/)
    if (h2 && mode === 'scanning') {
      if (currentSection) {
        currentSection.endLine = li
        if (currentSection.segments.length > 0) currentSection.segments.at(-1).endLine = li
      }
      const title = h2[1]
      if (seenTitles.has(title)) {
        throw new Error(`duplicate section title "${title}" across example files - numbering would merge them.`)
      }
      seenTitles.add(title)
      currentSection = {
        title,
        slug: slugify(title),
        startLine: li,
        endLine: lines.length,
        segments: [],
      }
      sections.push(currentSection)
      segmentStartLine = li + 1
      pendingBlocks = { carve: null, html: null }
      continue
    }
    const compareOpen = mode === 'scanning' && /^:{3,}\s+compare(\s+\S.*)?$/.test(line.trim())
    if (compareOpen) {
      compareMarker = line.trim().match(/^(:{3,})/)[1]
      compareOpenText = line
      pairsInBlock = 0
      compareModifiers = new Set(line.trim().split(/\s+/).slice(2))
      validateModifiers(compareModifiers, li + 1)
      comparesOpened++
      compareOpenLine = li + 1
      mode = 'in_compare'
      continue
    }
    if (mode === 'in_compare') {
      if (line.trim() === compareMarker) {
        finalizePair(li + 1, true)
        mode = 'scanning'
        compareMarker = null
        continue
      }
      const fenceOpen = line.match(/^(`{3,})(carve|html)\s*$/)
      if (fenceOpen) {
        /*
         * A block may hold several pairs. The fence that would OVERWRITE a
         * still-pending block closes the pair before it instead: four fences in
         * one `::: compare` are two documents, not one document written twice.
         * Before carve#1373 the assignment below simply clobbered, so every
         * pair after the first vanished before anything reached disk, and both
         * reconcile checks - being counts of the extraction, compared against
         * the extraction - reported a clean run.
         *
         * Finalizing here rather than at each html fence keeps the single-pair
         * case byte-identical: one pair still ends at the block's closer, so no
         * existing segment boundary moves.
         */
        if (pendingBlocks[fenceOpen[2]] !== null) finalizePair(li)
        fenceMarker = fenceOpen[1]
        currentLang = fenceOpen[2]
        blockLines = []
        mode = 'in_fence'
      }
      continue
    }
    if (mode === 'in_fence') {
      if (line.startsWith(fenceMarker) && line.slice(fenceMarker.length).trim() === '') {
        pendingBlocks[currentLang] = blockLines.join('\n')
        mode = 'in_compare'
        currentLang = null
        fenceMarker = null
        continue
      }
      blockLines.push(line)
    }
  }

  if (currentSection?.segments.length > 0) currentSection.segments.at(-1).endLine = lines.length

  for (const section of sections) {
    section.bodyLines = lines.slice(section.startLine, section.endLine)
    for (const segment of section.segments) {
      const body = lines.slice(segment.startLine, segment.endLine)
      if (segment.needsCloser) {
        while (body.length > 0 && body.at(-1).trim() === '') body.pop()
        body.push('', segment.compareCloseText, '')
      }
      if (segment.needsOpener) {
        while (body.length > 0 && body[0].trim() === '') body.shift()
        body.unshift(segment.compareOpenText, '')
      }
      segment.bodyLines = body
    }
  }
  return { sections, examples, comparesOpened, dropped }
}

export const scanSections = (lines) => scanExampleSource(lines).sections

/*
 * Corpus generation and documentation routing must use one naming operation.
 * If either side reconstructed suffixes independently, a harmless scanner edit
 * could leave a fixture present on disk but route a different pair to readers.
 */
export const numberExamples = (scan, numbers = new Map()) => {
  const sectionState = new Map()
  let sectionCounter = 0
  for (const example of scan.examples) {
    let state = sectionState.get(example.section)
    if (!state) {
      const declared = numbers.get(example.section)
      if (declared === undefined) sectionCounter++
      state = { idx: declared ?? sectionCounter, count: 0 }
      sectionState.set(example.section, state)
    }
    state.count++
    example.idx = String(state.idx).padStart(2, '0')
    example.slug = slugify(example.section)
    example.exampleIdx = state.count
    example.corpusName = `${example.idx}-${example.slug}${example.exampleIdx === 1 ? '' : `-${example.exampleIdx}`}`
  }
  for (const section of scan.sections) {
    for (const segment of section.segments) segment.corpusName = segment.example.corpusName
  }
  return scan.examples
}

export const numberSections = (scan) => {
  const sectionTitles = new Set(scan.examples.map((example) => example.section))
  let index = 0
  return scan.sections
    .filter((section) => sectionTitles.has(section.title))
    .map((section) => {
      index++
      const idx = String(index).padStart(2, '0')
      return { ...section, idx, corpusName: `${idx}-${section.slug}` }
    })
}
