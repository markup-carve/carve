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
    // TWO CAUSES MOVE THESE NUMBERS, and only one of them is drift.
    //
    //  - THE ENGINE changed what it imports or writes. Then the counts moved for
    //    a document set that did not, and the baseline is bumped WITH the engine
    //    pin, after inspecting every changed count.
    //  - THE CORPUS GREW. Then every count moves by construction and the pin has
    //    not moved at all. Bump the baseline in the same commit that adds the
    //    documents, and say in it which of them did NOT contribute to each
    //    round-trip count and why - an insertion that lands on `completed` but
    //    not on `renderImportRoundTrips.html` is telling you something about the
    //    new document.
    //
    // The message named only the first, so the first corpus insertion after this
    // ratchet landed (carve#1662) was told to do nothing (carve#1660).
    'the import population changed; if the engine pin moved, inspect every changed count and bump this with the pin - if the CORPUS grew instead, bump it in the commit that adds the documents and account for each count that did not move with it',
  )
})
