// Guards the 0.2 docs against being cut down to summaries plus spec links (carve#6957,
// after #6060 and #6063). Refresh the 0.1 numbers with `node scripts/docs-depth-baseline.mjs`.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { baselinePath, isDepthPage, measure, scanLines } from '../scripts/docs-depth-baseline.mjs'

const root = resolve(import.meta.dirname, '..')

const specLinkAllowlist = {
  'docs/whats-new-0-2.md': 'pending tri02docx',
}

// 0.1 pages that 0.2 deliberately dropped, with the reason. A page missing from HEAD fails otherwise.
const removedPages = {}

const specLink = /github\.com\/markup-carve\/carve\/blob\/[^/\s)]+\/spec\//
const specParagraph = '**Specification (external):**'

// Tracked pages only: `npm run docs:pages` writes generated pages (docs/examples/) that git ignores.
function docsPages() {
  return execFileSync('git', ['ls-files', 'docs'], { cwd: root, encoding: 'utf8' }).split('\n').filter(isDepthPage).sort()
}

function depthExempt(text) {
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/)
  return frontmatter?.[1].match(/^depth-exempt:\s*(\S.*)$/m)?.[1] ?? null
}

export function depthFailures(path, text, before) {
  if (depthExempt(text)) return []
  const now = measure(text)
  const demos = (m) => m.compare + m.carveFences + m.images
  const failures = []
  if (now.bytes < before.bytes / 2) failures.push(`${path}: ${now.bytes} bytes, 0.1 had ${before.bytes}`)
  if (now.headings < before.headings / 2) failures.push(`${path}: ${now.headings} headings, 0.1 had ${before.headings}`)
  if (demos(now) < demos(before) / 2) {
    failures.push(`${path}: ${demos(now)} compare blocks, Carve fences and images, 0.1 had ${demos(before)}`)
  }
  return failures
}

// Paragraphs outside code fences and frontmatter, with their first line number.
function paragraphs(text) {
  const lines = scanLines(text)
  let start = 0
  if (lines[0]?.line === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.line === '---')
    if (end > 0) start = end + 1
  }
  const out = []
  let current = null
  for (const l of lines.slice(start)) {
    if (l.fenced || l.line.trim() === '') {
      if (current) out.push(current)
      current = null
      if (l.fenced) out.push({ number: l.number, text: '', fenced: true })
      continue
    }
    if (current) current.text += `\n${l.line}`
    else current = { number: l.number, text: l.line }
  }
  if (current) out.push(current)
  return out
}

export function specLinkFailures(path, text) {
  const blocks = paragraphs(text)
  const isFootnote = (b) => !b.fenced && /^\[\^[^\]]+\]:/.test(b.text)
  let last = blocks.length - 1
  while (last >= 0 && isFootnote(blocks[last])) last--
  const failures = []
  let closing = 0
  for (const [index, block] of blocks.entries()) {
    const linkLines = block.text.split('\n').map((line, offset) => ({ line, number: block.number + offset }))
      .filter((l) => specLink.test(l.line))
    if (block.text.startsWith(specParagraph)) {
      closing++
      if (closing > 1) failures.push(`${path}:${block.number}: second ${specParagraph} paragraph`)
      else if (index !== last) failures.push(`${path}:${block.number}: ${specParagraph} is not the last paragraph`)
      continue
    }
    for (const l of linkLines) failures.push(`${path}:${l.number}: spec link outside the closing ${specParagraph} paragraph`)
  }
  for (const l of scanLines(text).filter((l) => l.fenced && specLink.test(l.line))) {
    failures.push(`${path}:${l.number}: spec link inside a code block`)
  }
  return failures
}

test('docs pages keep at least half of their 0.1 depth', () => {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const failures = []
  for (const [path, before] of Object.entries(baseline.pages)) {
    if (removedPages[path]) continue
    if (!existsSync(resolve(root, path))) {
      failures.push(`${path}: removed; record the reason in removedPages`)
      continue
    }
    failures.push(...depthFailures(path, readFileSync(resolve(root, path), 'utf8'), before))
  }
  assert.deepEqual(failures, [], 'add `depth-exempt: <reason>` to the frontmatter only when the cut is deliberate')
})

test('docs pages link the spec only from one closing paragraph', () => {
  const failures = docsPages()
    .filter((path) => !specLinkAllowlist[path])
    .flatMap((path) => specLinkFailures(path, readFileSync(resolve(root, path), 'utf8')))
  assert.deepEqual(failures, [])
})

const syntheticBefore = measure([
  '# Page', '', ...Array.from({ length: 10 }, (_, i) => [`## Part ${i}`, '', 'Explanation '.repeat(40), '', '```carve', '*x*', '```', '']).flat(),
].join('\n'))

test('the depth check fails on a page cut to 30% of its 0.1 size', () => {
  const cut = ['# Page', '', '## Part 0', '', 'Explanation '.repeat(100), ''].join('\n')
  assert.ok(measure(cut).bytes < syntheticBefore.bytes * 0.35)
  assert.equal(depthFailures('docs/synthetic.md', cut, syntheticBefore).length, 3)
  assert.deepEqual(depthFailures('docs/synthetic.md', `---\ndepth-exempt: merged into another page\n---\n${cut}`, syntheticBefore), [])
})

test('the spec-link check fails on a body spec link', () => {
  const url = 'https://github.com/markup-carve/carve/blob/main/spec/0.2/blocks.md'
  const body = `# Page\n\nSee [the clause](${url}) for details.\n\nMore text.\n`
  assert.deepEqual(specLinkFailures('docs/synthetic.md', body), [
    'docs/synthetic.md:3: spec link outside the closing **Specification (external):** paragraph',
  ])
  const closing = `# Page\n\nText.\n\n**Specification (external):** [blocks](${url}).\n\n[^1]: A footnote.\n`
  assert.deepEqual(specLinkFailures('docs/synthetic.md', closing), [])
  const notLast = `# Page\n\n**Specification (external):** [blocks](${url}).\n\nMore text.\n`
  assert.equal(specLinkFailures('docs/synthetic.md', notLast).length, 1)
})
