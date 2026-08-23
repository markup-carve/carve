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

const root = new URL('./corpus/', import.meta.url)
const baseline = JSON.parse(
  await readFile(new URL('../resources/import-roundtrip-baseline.json', import.meta.url), 'utf8'),
)

const visibleText = (html) =>
  new JSDOM(html).window.document.body.textContent.replace(/\s+/g, ' ').trim()

test('HTML import and render/import round trips cannot drift silently', async () => {
  const names = (await readdir(root)).filter((name) => name.endsWith('.crv')).sort()
  const measured = {
    corpusDocuments: names.length,
    htmlImportPopulation: {
      completed: 0,
      canonicalFixedPoints: 0,
      renderedTextPreserved: 0,
      expectedRejections: [],
    },
    renderImportRoundTrips: { html: 0, markdown: 0 },
  }

  for (const name of names) {
    const canonical = carveToCarve(await readFile(new URL(name, root), 'utf8'))
    const html = carveToHtml(canonical)
    try {
      const imported = htmlToCarve(html).value
      measured.htmlImportPopulation.completed++
      if (carveToCarve(imported) === imported) {
        measured.htmlImportPopulation.canonicalFixedPoints++
      }
      if (visibleText(carveToHtml(imported)) === visibleText(html)) {
        measured.htmlImportPopulation.renderedTextPreserved++
      }
      if (carveToCarve(imported) === canonical) measured.renderImportRoundTrips.html++
    } catch {
      measured.htmlImportPopulation.expectedRejections.push(name)
    }
    const markdownImported = markdownToCarve(carveToMarkdown(canonical))
    if (carveToCarve(markdownImported) === canonical) {
      measured.renderImportRoundTrips.markdown++
    }
  }

  assert.deepEqual(
    measured,
    {
      corpusDocuments: baseline.corpusDocuments,
      htmlImportPopulation: baseline.htmlImportPopulation,
      renderImportRoundTrips: baseline.renderImportRoundTrips,
    },
    'the import population changed; inspect every changed count and update the pinned baseline only with the engine pin',
  )
})
