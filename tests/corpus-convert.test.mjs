/*
 * The converters, gated on what the migrated document SAYS.
 *
 * The conformance corpus pairs a `.crv` with an expected output per render
 * target, so `compare:impls` covers everything that READS Carve. Nothing
 * covered what writes it. The converters run the other direction - foreign
 * source to Carve - so every importer sat outside every gate, and carve#1130
 * lists six times in one stretch of work that a converter fix reached one
 * engine and not the others. Each of the six was found by a DIFFERENT engine's
 * suite or by hand-built differential scaffolding that was thrown away
 * afterwards; carve-php passed all 11,886 of its tests while dropping a
 * Markdown hard break and corrupting an indented code block.
 *
 * This is the per-PR half, against the build this repo pins - the same split
 * `tests/corpus-fmt-roundtrip.test.mjs` has with `scripts/fmt-fixture-claims.mjs`.
 * The cross-engine half is `scripts/compare-impls.mjs --corpus=convert`, which
 * needs the three provisioned checkouts and runs in the scheduled conformance
 * workflow; this file is what runs on every PR without them.
 *
 * A CASE IS A DIRECTORY, `tests/corpus-convert/NN-slug/`, holding one
 * `input.<ext>` and one `expected.html`. The directory shape is
 * `tests/html-import/`'s, and it is what the extensions force: the source of an
 * HTML case and the expected render of any case would otherwise both want to be
 * `NN-slug.html`.
 *
 * TWO ASSERTIONS PER CASE, and only the second one makes the first answerable.
 *
 *   BYTES. Convert the source with the pinned build, render the produced Carve
 *   with the pinned build, compare to `expected.html`. This is a regression pin:
 *   it fails loudly on any change, and it says nothing about whether the new
 *   answer or the old one is right.
 *
 *   MEANING. The TEXT of that render must equal the text the SOURCE LANGUAGE
 *   itself yields for the same input, read by something that is not Carve. For
 *   a Markdown case that reader is `marked` in GFM mode; for an HTML case it is
 *   the source document; for a BBCode case whose input carries no tag it is the
 *   input verbatim. A converter that INVENTS markup fails here and nowhere
 *   else: a `<sup>` swallows the carets that were in the source, a fenced div
 *   swallows both delimiter lines, an abbreviation definition removes its whole
 *   line, and every one of those is a text change an independent reader can see.
 *
 * WHY THE SECOND ONE IS THE POINT. A corpus written by recording what an engine
 * currently does pins the engine to itself: it goes red on a fix and green on a
 * regression that was already there when the bytes were taken. The nine
 * constructs carve-js#1060 fixed reached Carve precisely BECAUSE nothing in the
 * converter mentioned them - Carve already spells them the way the source does,
 * so leaving the source alone WAS the conversion. No amount of recorded output
 * finds that class; a second reader does, immediately.
 *
 * THE DIALECT IS DECIDED, and these expectations encode it rather than assume
 * it. carve#1130's ruling: CommonMark plus GFM is the contract, and anything
 * past it - Pandoc superscript, Obsidian highlight, dollar math - is a
 * constructor flag that defaults to off. That is why `a ^b^ c` and `d ==e== f`
 * come back as text while `a ~b~ c` comes back struck: single-tilde IS GFM
 * strikethrough, and the oracle says so without being asked.
 *
 * WHAT THIS FILE DOES NOT GATE. It runs ONE engine, so it cannot see a defect
 * that spares carve-js - which is most of carve#1130's six rows, since each was
 * a defect in some other engine. That half is the cross-engine runner
 * (`npm run compare:convert`), which walks this same corpus through every
 * engine that imports each format; this file gives it the corpus and stops
 * the pinned engine from drifting between its scheduled runs.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as pinned from '@markup-carve/carve'
import { marked } from 'marked'
import { parse as djotParse, renderHTML as djotRenderHTML } from '@djot/djot'
import { FORMAT_EXTENSIONS } from '../scripts/lib/converter-formats.mjs'

const { bbcodeToCarve, carveToHtml, htmlToCarve, markdownToCarve } = pinned

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus-convert')

/*
 * The source formats this repo can drive from the pinned build.
 *
 * `convert` is the importer. `oracle` answers "what does the SOURCE language
 * say this document contains", and it must never call Carve - the whole value
 * of the second assertion is that it comes from somewhere else.
 */
const FORMATS = {
  md: {
    convert: (source) => markdownToCarve(source),
    // GFM, because that is the dialect carve#1130 ruled the contract on.
    oracle: (source) => marked.parse(source, { gfm: true, async: false }),
  },
  html: {
    // The importer returns a document plus a diagnostic report; the corpus
    // pairs on the document, and the report is `tests/html-import/`'s subject.
    convert: (source) => htmlToCarve(source).value,
    oracle: (source) => source,
  },
  bbcode: {
    convert: (source) => bbcodeToCarve(source),
    /*
     * No BBCode reader is available here, so every BBCode case's input is
     * chosen to carry no BBCode tag at all. Its text is then the input itself,
     * which is exactly the `plain` profile - text in, text out - and the class
     * four of carve#1130's six rows lived in.
     */
    oracle: (source) => source,
  },
  djot: {
    /*
     * The pinned build has NO Djot importer - carve#1130's coverage table, and
     * the declared gap in scripts/lib/converter-formats.mjs. The BYTES
     * assertion therefore skips these cases here (visibly - see the skip test
     * below); the cross-engine runner (`compare:impls -- --corpus=convert`)
     * drives them through carve-php and carve-rs, which both import Djot.
     *
     * The MEANING assertion still runs: it reads expected.html against the
     * SOURCE language's own reader, and needs no Carve importer at all. That
     * keeps a Djot expectation answerable on every PR even though nothing here
     * can regenerate it.
     */
    convert: null,
    oracle: (source) => djotRenderHTML(djotParse(source)),
  },
}

/*
 * Formats whose BYTES assertion cannot run against the pinned build, each with
 * the reason. Kept next to FORMATS rather than inferred from `convert: null`
 * so the skip is a DECLARED state with prose attached - and asserted in both
 * directions below, so the entry cannot outlive the gap.
 */
const PINNED_UNIMPLEMENTED = {
  djot: 'the pinned @markup-carve/carve exports no djotToCarve; the cross-engine gate covers this format',
}

/*
 * Cases whose expectation encodes a ruling the PINNED build has not shipped -
 * the per-PR twin of resources/converter-drift.txt, and deliberately a
 * separate list: that file describes the engine CHECKOUTS the scheduled gate
 * drives, this one describes the build package.json pins, and the two move at
 * different times (a fix lands on an engine's main first, the pin follows).
 *
 * Same discipline as every declared list in this repo: a slug listed here is
 * excused from the bytes assertion with its reason on record, a listed slug
 * that starts matching fails as STALE until the entry is deleted in the commit
 * that moves the pin, and the meaning assertion still runs regardless.
 */
const PINNED_DRIFT = {
  // NO ENTRIES. The pin reproduces every converter case's expectation, which is
  // the state this list is meant to return to rather than an unusual one. The
  // last entry, 28-html-a-mixed-list-stays-loose, cleared when the pin moved
  // past markup-carve/carve-js#1110.
}

/**
 * The visible text of an HTML fragment.
 *
 * Deliberately crude: tags out, references in, whitespace flattened. It is
 * comparing two renderings of the same words, so what must survive is which
 * CHARACTERS are present as text - not where the line breaks fell or which
 * element carried them. `<br>` becomes a space rather than nothing, or a hard
 * break would read as a lost word boundary against a reader that renders it as
 * an element.
 */
const textOf = (html) =>
  html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    // Ampersand last, or `&amp;#35;` would decode twice into `#`.
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const readCase = (slug) => {
  const dir = resolve(corpusDir, slug)
  const files = readdirSync(dir).sort()
  const inputs = files.filter((f) => f.startsWith('input.'))
  return { slug, dir, files, inputs }
}

const cases = readdirSync(corpusDir)
  .filter((entry) => statSync(resolve(corpusDir, entry)).isDirectory())
  .sort()
  .map(readCase)

test('the converter corpus is read, so it can fail', () => {
  // Guards every sweep below against a glob that quietly matches nothing, which
  // is the failure mode carve#755 catalogs eleven instances of.
  assert.ok(cases.length >= 10, `found ${cases.length} converter cases`)
})

test('every case holds exactly one input and one expected render', () => {
  const wrong = []
  for (const { slug, files, inputs } of cases) {
    if (inputs.length !== 1) wrong.push(`${slug}: ${inputs.length} input file(s)`)
    else if (!FORMATS[inputs[0].slice('input.'.length)]) wrong.push(`${slug}: unknown source format "${inputs[0]}"`)
    if (!files.includes('expected.html')) wrong.push(`${slug}: no expected.html`)
    const extra = files.filter((f) => f !== 'expected.html' && !f.startsWith('input.'))
    if (extra.length) wrong.push(`${slug}: unexpected file(s) ${extra.join(', ')}`)
  }
  assert.deepEqual(wrong, [], `malformed converter case(s):\n  ${wrong.join('\n  ')}`)
})

test('every source format in the corpus is a known one', () => {
  // Naming a format nothing knows would make its cases silently unreachable
  // rather than failing, so the set is asserted rather than filtered - against
  // FORMATS here and against the shared table both runners read.
  const used = new Set(cases.map(({ inputs }) => inputs[0].slice('input.'.length)))
  const shared = new Set(Object.values(FORMAT_EXTENSIONS))
  for (const format of used) {
    assert.ok(FORMATS[format], `no importer or declared gap wired for "${format}"`)
    assert.ok(shared.has(format), `"${format}" is not in scripts/lib/converter-formats.mjs, so the cross-engine runner cannot see its cases`)
  }
  assert.ok(used.size >= 2, `the corpus exercises ${used.size} source format(s)`)
})

test('every declared pinned-build gap is still a gap', () => {
  // Both directions, like every declared list in this repo: the entry excuses
  // the bytes assertion below, so the day the pinned build gains the importer
  // this fails until the entry is deleted and the cases run.
  for (const [format, reason] of Object.entries(PINNED_UNIMPLEMENTED)) {
    assert.ok(FORMATS[format], `PINNED_UNIMPLEMENTED names "${format}" but FORMATS does not carry it`)
    assert.equal(
      FORMATS[format].convert,
      null,
      `PINNED_UNIMPLEMENTED declares "${format}" (${reason}) but FORMATS wires a converter - delete the stale entry`,
    )
    const exportName = `${format}ToCarve`
    assert.equal(
      pinned[exportName],
      undefined,
      `PINNED_UNIMPLEMENTED declares "${format}" but the pinned build exports ${exportName} - delete the stale entry and run the cases`,
    )
  }
  for (const [format, spec] of Object.entries(FORMATS)) {
    if (spec.convert === null) {
      assert.ok(
        PINNED_UNIMPLEMENTED[format],
        `FORMATS["${format}"] has no converter and no PINNED_UNIMPLEMENTED entry - a silent skip is the failure mode this corpus exists to prevent`,
      )
    }
  }
  // A drift entry naming no case excuses nothing while looking like it does -
  // the renamed-slug failure mode the render corpus's declared lists guard
  // against too.
  const slugs = new Set(cases.map(({ slug }) => slug))
  for (const slug of Object.keys(PINNED_DRIFT)) {
    assert.ok(slugs.has(slug), `PINNED_DRIFT names "${slug}" but no such case exists - renamed, or a typo`)
  }
})

test('convert then render matches the pinned bytes', () => {
  const wrong = []
  let ran = 0
  let skipped = 0
  for (const { slug, dir, inputs } of cases) {
    const format = inputs[0].slice('input.'.length)
    if (FORMATS[format].convert === null) {
      // Declared above; the cross-engine runner covers these cases.
      skipped++
      continue
    }
    ran++
    const source = readFileSync(resolve(dir, inputs[0]), 'utf8')
    const expected = readFileSync(resolve(dir, 'expected.html'), 'utf8')
    const actual = carveToHtml(FORMATS[format].convert(source))
    const withNewline = actual.endsWith('\n') ? actual : `${actual}\n`
    if (withNewline !== expected) {
      if (Object.hasOwn(PINNED_DRIFT, slug)) continue // declared: the pin is behind the ruling
      wrong.push(`${slug}\n    expected: ${JSON.stringify(expected)}\n      actual: ${JSON.stringify(withNewline)}`)
    } else if (Object.hasOwn(PINNED_DRIFT, slug)) {
      wrong.push(
        `${slug}: PINNED_DRIFT declares this case (${PINNED_DRIFT[slug]}) but the pinned build now matches - delete the STALE entry in the commit that moves the pin`,
      )
    }
  }
  assert.deepEqual(wrong, [], `the converted document no longer renders as pinned:\n  ${wrong.join('\n  ')}`)
  // The skip is bounded by the declaration: exactly the cases of the declared
  // formats sat out, and something actually ran.
  const declaredCases = cases.filter(({ inputs }) =>
    Object.hasOwn(PINNED_UNIMPLEMENTED, inputs[0].slice('input.'.length)),
  ).length
  assert.equal(skipped, declaredCases, `${skipped} case(s) skipped but ${declaredCases} belong to declared-gap formats`)
  assert.ok(ran >= 10, `only ${ran} converter case(s) actually ran against the pinned build`)
})

test('the migrated document says what the source language says', () => {
  const wrong = []
  for (const { slug, dir, inputs } of cases) {
    const format = inputs[0].slice('input.'.length)
    const source = readFileSync(resolve(dir, inputs[0]), 'utf8')
    const expected = readFileSync(resolve(dir, 'expected.html'), 'utf8')
    const ours = textOf(expected)
    const theirs = textOf(FORMATS[format].oracle(source))
    if (ours !== theirs) {
      wrong.push(`${slug}\n    ${format} reader: ${JSON.stringify(theirs)}\n       migrated: ${JSON.stringify(ours)}`)
    }
  }
  assert.deepEqual(
    wrong,
    [],
    'the migrated document does not say what the source says - the converter either invented markup or dropped text:\n  ' +
      wrong.join('\n  '),
  )
})
