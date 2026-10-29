/*
 * The edge-case sections live one per file, `resources/examples/edge-cases/NNNN-slug.md`,
 * numbered by the file name so two PRs adding a section touch no shared file.
 * These tests pin the reader against the shipped source and against a scratch
 * source that holds the shapes concurrent PRs produce.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  exampleSectionNumbers,
  exampleSourceComplaints,
  exampleSourceFiles,
  numberExamples,
  readExampleFiles,
  scanExampleSource,
} from '../scripts/lib/example-sections.mjs'
import { collectSections, frontMatterRoutes, parsePages, routePages, unroutedFixtures } from '../scripts/lib/example-page-manifest.mjs'

const repoRoot = resolve(import.meta.dirname, '..')

const pair = (carve, html) => ['::: compare', '', '```carve', carve, '```', '', '```html', html, '```', '', ':::', ''].join('\n')

const scratchSource = (files) => {
  const root = mkdtempSync(join(tmpdir(), 'carve-example-files-'))
  mkdirSync(join(root, 'resources/examples/edge-cases'), { recursive: true })
  writeFileSync(join(root, 'resources/examples/core.md'), `# Core\n\n## Emphasis\n\n${pair('*a*', '<p><strong>a</strong></p>')}`)
  writeFileSync(join(root, 'resources/examples/extensions.md'), `# Extensions\n\n## Mark\n\n${pair('=a=', '<p><mark>a</mark></p>')}`)
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, 'resources/examples/edge-cases', name), text)
  return root
}

const corpusNames = (root) => {
  const scan = scanExampleSource(readExampleFiles(root).split('\n'))
  numberExamples(scan, exampleSectionNumbers(root))
  return scan.examples.map((example) => example.corpusName)
}

test('every shipped section file is one section named by its number and slug', () => {
  assert.deepEqual(exampleSourceComplaints(repoRoot), [])
  const files = exampleSourceFiles(repoRoot).filter((source) => source.group === 'edge-cases')
  assert.ok(files.length > 700, `expected the edge-case section files, found ${files.length}`)
})

test('a section file takes the number in its name, not its position', () => {
  const root = scratchSource({
    '0003-first.md': `## First\n\n${pair('a', '<p>a</p>')}`,
    '0010-later.md': `## Later\n\n${pair('b', '<p>b</p>')}${pair('c', '<p>c</p>')}`,
  })
  assert.deepEqual(exampleSourceComplaints(root), [])
  assert.deepEqual(corpusNames(root), ['01-emphasis', '02-mark', '03-first', '10-later', '10-later-2'])
})

test('two sections that took the same number both keep it', () => {
  // Two PRs that each took the next free number merge without a conflict.
  const root = scratchSource({
    '0003-zeta.md': `## Zeta\n\n${pair('z', '<p>z</p>')}`,
    '0003-alpha.md': `## Alpha\n\n${pair('a', '<p>a</p>')}`,
  })
  assert.deepEqual(exampleSourceComplaints(root), [])
  assert.deepEqual(corpusNames(root), ['01-emphasis', '02-mark', '03-alpha', '03-zeta'])
})

test('a section file that cannot be numbered is a complaint', () => {
  const root = scratchSource({
    'no-number.md': `## No number\n\n${pair('a', '<p>a</p>')}`,
    '0004-wrong-slug.md': `## Right slug\n\n${pair('a', '<p>a</p>')}`,
    '0005-two.md': `## Two\n\n${pair('a', '<p>a</p>')}## Three\n\n${pair('b', '<p>b</p>')}`,
    '0002-taken.md': `## Taken\n\n${pair('a', '<p>a</p>')}`,
    '0006-odd-key.md': `---\nslot: 1\n---\n\n## Odd key\n\n${pair('a', '<p>a</p>')}`,
  })
  const complaints = exampleSourceComplaints(root).join('\n')
  assert.match(complaints, /no-number\.md is not named NNNN-slug\.md/)
  assert.match(complaints, /0004-wrong-slug\.md holds section "Right slug"/)
  assert.match(complaints, /0005-two\.md must hold exactly one section/)
  assert.match(complaints, /0002-taken\.md takes number 2, which core\.md and extensions\.md already number/)
  assert.match(complaints, /0006-odd-key\.md: front matter key "slot" is unknown/)
})

test('front matter routes a section to its page and is not section content', () => {
  const root = scratchSource({
    '0004-routed.md': `---\npage: edge\n---\n\n## Routed\n\n${pair('r', '<p>r</p>')}`,
    '0003-listed.md': `## Listed\n\n${pair('l', '<p>l</p>')}`,
  })
  assert.deepEqual(exampleSourceComplaints(root), [])
  assert.deepEqual(corpusNames(root), ['01-emphasis', '02-mark', '03-listed', '04-routed'])

  const { sectionsBySlug, segmentsByName, complaints } = collectSections(root)
  assert.deepEqual(complaints, [])
  assert.equal(sectionsBySlug.get('routed').bodyLines[0], '## Routed')

  const manifest = '[core] Core\n> c\nout: c.md\n  emphasis\n  mark\n\n[edge] Edge\n> e\nout: e.md\n  listed\n'
  const { pages } = parsePages(manifest)
  assert.deepEqual(frontMatterRoutes({ pages, sectionsBySlug }).complaints, [])
  assert.deepEqual(pages[1].slugs, ['listed', 'routed'])
  const { routedSegments, complaints: routeComplaints } = routePages({ pages, sectionsBySlug, segmentsByName })
  assert.deepEqual(routeComplaints, [])
  assert.deepEqual(unroutedFixtures({ routedSegments, segmentsByName }), [])
})

test('a front matter page that does not exist, or a section routed twice, is a complaint', () => {
  const root = scratchSource({
    '0003-lost.md': `---\npage: nowhere\n---\n\n## Lost\n\n${pair('a', '<p>a</p>')}`,
    '0004-twice.md': `---\npage: edge\n---\n\n## Twice\n\n${pair('b', '<p>b</p>')}`,
  })
  const { sectionsBySlug, segmentsByName } = collectSections(root)
  const { pages } = parsePages('[core] Core\n> c\nout: c.md\n  emphasis\n  mark\n\n[edge] Edge\n> e\nout: e.md\n  twice\n')
  assert.match(frontMatterRoutes({ pages, sectionsBySlug }).complaints.join('\n'), /section "lost" names page "nowhere"/)
  assert.match(routePages({ pages, sectionsBySlug, segmentsByName }).complaints.join('\n'), /"04-twice" is routed to both page "edge" and page "edge"/)
})
