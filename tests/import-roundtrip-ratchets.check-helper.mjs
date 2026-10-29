import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import {
  carveToCarve,
  carveToHtml,
  carveToMarkdown,
  htmlToCarve,
  markdownToCarve,
} from '@markup-carve/carve'
import { compareExceptions, corpusId, readExceptions, writeExceptions } from '../scripts/lib/exception-list.mjs'

const root = new URL('./corpus/', import.meta.url)
const lists = new URL('../resources/roundtrip/', import.meta.url)

// Each list names the corpus ids that do NOT pass its measure at the pinned
// carve-js. CARVE_ROUNDTRIP_WRITE=1 rewrites them from a run; inspect the diff.
const MEASURES = {
  rejected: 'import-html-rejected.txt',
  notFixedPoint: 'import-html-not-fixed-point.txt',
  textChanged: 'import-html-text-changed.txt',
  htmlMisses: 'import-roundtrip-html-misses.txt',
  markdownMisses: 'import-roundtrip-markdown-misses.txt',
}

const visibleText = (html) =>
  new JSDOM(html).window.document.body.textContent.replace(/\s+/g, ' ').trim()

test('HTML import and render/import round trips cannot drift silently', async (t) => {
  const names = (await readdir(root)).filter((name) => name.endsWith('.crv')).sort()
  const failing = Object.fromEntries(Object.keys(MEASURES).map((key) => [key, []]))

  for (const name of names) {
    const id = corpusId(name)
    const canonical = carveToCarve(await readFile(new URL(name, root), 'utf8'))
    const html = carveToHtml(canonical)
    try {
      const imported = htmlToCarve(html).value
      if (carveToCarve(imported) !== imported) failing.notFixedPoint.push(id)
      if (visibleText(carveToHtml(imported)) !== visibleText(html)) failing.textChanged.push(id)
      if (carveToCarve(imported) !== canonical) failing.htmlMisses.push(id)
    } catch {
      failing.rejected.push(id)
      failing.htmlMisses.push(id)
    }
    const markdownImported = markdownToCarve(carveToMarkdown(canonical))
    if (carveToCarve(markdownImported) !== canonical) failing.markdownMisses.push(id)
  }

  const corpus = names.map(corpusId)
  const completed = names.length - failing.rejected.length
  t.diagnostic(`${names.length} documents: ${completed} import, ${completed - failing.notFixedPoint.length} fixed points, ` +
    `${completed - failing.textChanged.length} keep their text, ${names.length - failing.htmlMisses.length} round-trip through HTML, ` +
    `${names.length - failing.markdownMisses.length} through Markdown`)
  if (process.env.CARVE_ROUNDTRIP_WRITE === '1') {
    for (const [key, file] of Object.entries(MEASURES)) writeExceptions(new URL(file, lists), failing[key])
    return
  }
  const problems = Object.entries(MEASURES).flatMap(([key, file]) => {
    const declared = readExceptions(new URL(file, lists))
    if (declared === null) return [`resources/roundtrip/${file} is missing`]
    return compareExceptions({ name: `resources/roundtrip/${file}`, declared, failing: failing[key], corpus })
  })
  // A new corpus row that fails a measure is listed in the commit that adds
  // it; an engine pin that fixes a row removes it. CARVE_ROUNDTRIP_WRITE=1
  // rewrites the lists after the diff has been inspected.
  assert.deepEqual(problems, [], 'the HTML import and round-trip exception lists drifted')
})
