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

// The carve-js pin at 8392a032 makes the reference in corpus row 442-...-8
// resolve. On its HTML round-trip, the imported empty ordered item is then
// written as literal `+`, so that row loses visible-text preservation (-1).
// Its Markdown changes make rows 447-...-11 and -14 round-trip, while
// 453-...-3, 454-... and 454-...-2 no longer do, for a net count of -1.
// This is an inspected snapshot, not an endorsement of those three losses;
// the ratchet keeps them visible for a dedicated writer/parser correction.

// Corpus 462 is the only joiner behind the +1 on every count below, and it moves
// EVERY one: an include directive with no resolver is a paragraph of literal
// text, so it imports, is a fixed point of the writer, preserves its visible
// text and round-trips through both HTML and Markdown. A count that had not
// moved with it would be the finding here - literal text failing one of those
// is a writer or importer bug, not a property of the directive.

// The 59ae4a60 pin repairs both round trips for all three corpus 464 tight-item
// cases. Corpus 467-...-2 stops matching byte for byte after the corrected
// autolink is imported as an explicit link, so HTML moves by a net +2.
// Markdown also moves by +2: corpus 467-... gains a round trip, while 276-...-5
// and 84-...-5 stop matching because the corrected writer escapes a literal
// tilde run and a paragraph-leading hash. Those escapes preserve the parsed
// structures instead of changing them into a fence or heading. All seven
// per-document changes were compared directly against d81c0278.

// Corpus 9c845248 adds six documents. The four new top-level heading cases
// contribute HTML round trips. The nested heading in 84-...-10 also contributes
// a Markdown round trip under 59ae4a60; the other new heading cases and
// 12-inline-code-7 do not. This accounts for every change from 1707 to 1713
// documents instead of carrying forward the counts measured under d81c0278.

// Under 75734e8 12-inline-code-7 gains its HTML round trip (carve-js#1778), and
// 84-...-10 loses its Markdown one: the writer now escapes the heading's
// trailing hash run as #2056 requires, and the importer keeps that backslash in
// Carve where none is needed. Both readings render the same heading; the old
// round trip passed on Markdown that dropped the hashes.

// Corpus 469 and 470 add eight documents; all eight import and preserve their
// text. HTML misses only 469-...-3, whose smart quotes return as literal curly
// quotes. Markdown misses 469-..., -2 and -3, where the writer escapes the `]`
// so CommonMark does not read an empty link, and 470-...-5, where it
// percent-encodes `<` and `>` in the destination.

// 12-inline-code-8 and -9 import and preserve their text. -8 round-trips through
// HTML; -9 does not, because its comment has no HTML to return from. Neither
// round-trips through Markdown, which has no underline, span attributes or comment.

// 12-inline-code-10 imports and preserves its text but round-trips through neither
// format: the HTML import reads a literal back as plain text, and the Markdown
// writer has no spelling for math or a literal inside emphasis.

// 152-leading-attribute-brace-before-an-inline-span-stays-literal-2 imports and
// preserves its text but round-trips through neither format: its straight quotes
// render as curly ones and come back as those characters.

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
