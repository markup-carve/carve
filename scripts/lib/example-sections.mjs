import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const exampleFiles = ['core', 'extensions', 'edge-cases']

export const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const readExampleFiles = (repoRoot) => exampleFiles
  .map((name) => readFileSync(resolve(repoRoot, 'resources/examples', `${name}.md`), 'utf8'))
  .join('\n')

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
    if (currentSection && pendingBlocks.carve && pendingBlocks.html) {
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
export const numberExamples = (scan) => {
  const sectionState = new Map()
  let sectionCounter = 0
  for (const example of scan.examples) {
    let state = sectionState.get(example.section)
    if (!state) {
      sectionCounter++
      state = { idx: sectionCounter, count: 0 }
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
