import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(__dirname, 'corpus')

// Characters an editor, formatter or sanitizer would plausibly "clean up", but
// which are the ASSERTION in the pairs below. Losing one silently weakens or
// voids the test it belongs to, so their presence is pinned here.
const WATCHED = new Map([
  // The NULL is the sharpest of them: a fixture carrying it is BINARY to git,
  // so no diff shows it and no review can see it go. It is also the one
  // character here that a fixture asserts the ABSENCE of downstream - the
  // `.crv` holds it, the `.html` holds U+FFFD - so losing it from the input
  // leaves a pair that still matches and pins nothing (carve#1523).
  [0x0000, 'NUL'],
  [0x00a0, 'NBSP'],
  [0x200b, 'ZWSP'],
  [0x200c, 'ZWNJ'],
  [0x200d, 'ZWJ'],
  [0x200e, 'LRM'],
  [0x200f, 'RLM'],
  [0x202a, 'LRE'],
  [0x202b, 'RLE'],
  [0x202c, 'PDF'],
  [0x202d, 'LRO'],
  [0x202e, 'RLO'],
  [0x2066, 'LRI'],
  [0x2067, 'RLI'],
  [0x2068, 'FSI'],
  [0x2069, 'PDI'],
  [0xfeff, 'BOM'],
  // The whitespace-adjacent characters `blank_line = {whitespace}` deliberately
  // does NOT admit (carve#890). A fixture asserting one of these is CONTENT
  // holds nothing else on the line, so a formatter that "cleans up" the line
  // turns the assertion into a blank line - which is the very reading the
  // fixture exists to deny. They are exactly as invisible as the bidi controls
  // above and want the same protection.
  [0x000b, 'VT'],
  [0x000c, 'FF'],
  [0x0085, 'NEL'],
  [0x1680, 'OGHAM-SP'],
  [0x2000, 'EN-QUAD'],
  [0x2009, 'THIN-SP'],
  [0x200a, 'HAIR-SP'],
  [0x2028, 'LS'],
  [0x2029, 'PS'],
  [0x202f, 'NNBSP'],
  [0x205f, 'MMSP'],
  [0x3000, 'IDEO-SP'],
])

// The inventory. Each entry names the invisible characters (and trailing ASCII
// whitespace) a fixture MUST still contain.
//
// `html` matters most where it is non-empty: when the same invisible character
// appears raw in BOTH the input and the expected output, stripping it from the
// pair keeps them in sync, so the corpus test still PASSES while no longer
// testing anything. That is the only silent-decay shape, and today only the
// Trojan-Source ZWSP pair has it. Everywhere else the expectation spells the
// character differently (`&nbsp;`) or drops it, so loss shows up as a normal
// corpus mismatch.
const INVENTORY = [
  { base: '05-lists-3', crv: ['trailing-WS'], html: [] }, // `:: ` - the separator space IS the case
  { base: '104-paragraph-trailing-whitespace', crv: ['trailing-WS'], html: [] },
  {
    base: '119-trojan-source-heading-ids-are-nfc-normalized-and-strip-invisible-controls-3',
    crv: ['RLO', 'ZWSP'],
    html: ['ZWSP'], // silent-decay shape: raw in both sides
  },
  { base: '120-trojan-source-rendered-text-and-code-strip-bidi-override-controls', crv: ['RLO'], html: [] },
  { base: '120-trojan-source-rendered-text-and-code-strip-bidi-override-controls-2', crv: ['RLO'], html: [] },
  { base: '141-trailing-whitespace-boundaries-4', crv: ['NBSP'], html: [] },
  { base: '16-reference-link-9', crv: ['trailing-WS'], html: [] },
  { base: '29-non-breaking-space-3', crv: ['NBSP'], html: [] },
  { base: '249-trailing-whitespace-after-a-block-marker', crv: ['trailing-WS'], html: [] }, // a thematic break
  { base: '249-trailing-whitespace-after-a-block-marker-2', crv: ['trailing-WS'], html: [] }, // a code fence's closer
  { base: '249-trailing-whitespace-after-a-block-marker-3', crv: ['trailing-WS'], html: [] }, // a colon fence's closer
  { base: '249-trailing-whitespace-after-a-block-marker-4', crv: ['trailing-WS'], html: [] }, // a table's continuation row
  { base: '249-trailing-whitespace-after-a-block-marker-6', crv: ['trailing-WS'], html: [] }, // the `+` continuation marker - §17 L3 says "only content is `+`"
  { base: '84-single-line-headings-5', crv: ['trailing-WS'], html: [] },
  // The caret and its separator with NOTHING after them is the case: MARKER
  // REQUIRES CONTENT (PART 2) opens no caption there, so the quote above stays
  // a quote and the line is the paragraph `^`. Strip the run and both lines
  // become a bare caret, which is a different document and the one already
  // pinned elsewhere (carve#1575).
  { base: '404-a-caption-s-marker-separator-is-a-run-and-none-of-it-is-content-2', crv: ['trailing-WS'], html: [] },
  // The no-break space is the case: it is non-ASCII, so it passes into the
  // heading id unchanged instead of being slugged to a separator, and the
  // id carries the character rather than an entity.
  { base: '217-a-heading-id-keeps-a-non-ascii-space', crv: ['NBSP'], html: ['NBSP'] },
  // The ZERO WIDTH SPACE is the case, on BOTH sides: §25's scheme probe stops
  // at whitespace-plus-BOM, so this destination keeps the character the author
  // wrote and renders it into the href. Strip it and the fixture asserts
  // nothing - it becomes an ordinary denied-scheme case (carve#782).
  {
    base: '238-a-format-character-before-a-scheme-is-not-stripped-and-is-inert',
    crv: ['ZWSP'],
    html: ['ZWSP'],
  },
  // The BOM is the case, on BOTH sides, and in the DEFINITION half of the rule:
  // a zero-width character is an ordinary destination character there too,
  // because the definition is built from the same `link_destination`. Strip it
  // and the pair still matches, testing nothing - which is the shape that let
  // carve#806 be closed while this half was still wrong.
  {
    base: '240-a-zero-width-character-in-a-reference-definition-destination',
    crv: ['BOM'],
    html: ['BOM'],
  },
  {
    base: '240-a-zero-width-character-in-a-reference-definition-destination-2',
    crv: ['BOM'],
    html: ['BOM'],
  },
  // The line endings ARE the case. These are the only fixtures produced by a
  // byte transform (`::: compare crlf | cr | bom` in scripts/generate-corpus.mjs)
  // rather than copied out of the example source, because the example files are
  // reviewable Markdown and `.gitattributes` does not protect them the way it
  // protects tests/corpus (carve#872).
  { base: '250-line-endings-and-a-byte-order-mark', crv: ['CRLF'], html: [] },
  { base: '250-line-endings-and-a-byte-order-mark-2', crv: ['CR'], html: [] },
  { base: '250-line-endings-and-a-byte-order-mark-3', crv: ['BOM'], html: [] },
  // The narrow no-break space is what PART 12's scheme probe has to walk past
  // before it sees `javascript:`. Strip it and the destination is a plain
  // denied scheme, so the fixture stops testing the Unicode half of the probe
  // and keeps passing. It predates the WATCHED entry for U+202F (carve#890).
  { base: '121-scheme-probe-strips-unicode-whitespace', crv: ['NNBSP'], html: [] },
  // The invisible character on a line of its own IS the case: it is what makes
  // the line non-blank, so losing it does not weaken the pair, it inverts it.
  // Each of the three carries a different group of them - the two documents
  // below the first are the whole reason the third column of carve#890's table
  // is not just U+FEFF.
  {
    base: '261-a-blank-line-holds-spaces-and-tabs-and-nothing-else',
    crv: ['BOM', 'trailing-WS'],
    html: ['BOM'], // raw on both sides
  },
  {
    base: '261-a-blank-line-holds-spaces-and-tabs-and-nothing-else-2',
    crv: ['NBSP', 'ZWSP', 'OGHAM-SP', 'EN-QUAD', 'THIN-SP', 'HAIR-SP', 'NNBSP', 'MMSP', 'IDEO-SP'],
    // The NBSP is spelled `&nbsp;` in the expected HTML, so it is not listed
    // here; every other one is raw on both sides and would decay silently.
    html: ['ZWSP', 'OGHAM-SP', 'EN-QUAD', 'THIN-SP', 'HAIR-SP', 'NNBSP', 'MMSP', 'IDEO-SP'],
  },
  {
    base: '261-a-blank-line-holds-spaces-and-tabs-and-nothing-else-3',
    crv: ['VT', 'FF', 'NEL', 'LS', 'PS'],
    html: ['VT', 'FF', 'NEL', 'LS', 'PS'],
  },
  // The no-break space after a definition marker's separator run IS the case
  // (carve#892): it is the first character the run does not admit, so it is
  // where the separator ends and the content begins. Strip it and both
  // documents collapse into the one-space form, which is already pinned twice
  // over and would pass for free.
  {
    base: '267-a-definition-marker-s-separator-is-a-space-and-it-is-a-run-3',
    crv: ['NBSP'],
    // The expansion is a `title` attribute, where the NBSP is raw on both
    // sides. That is why the html column is not empty here and is at the
    // footnote below, whose body spells it `&nbsp;`.
    html: ['NBSP'],
  },
  {
    base: '267-a-definition-marker-s-separator-is-a-space-and-it-is-a-run-4',
    crv: ['NBSP'],
    html: [],
  },
  // carve#926's category. Here the trailing run IS the case in both
  // directions: in the nine documents whose `.crv` ends in `whitespace` the
  // point is that it does NOT survive, and in the two that end in something
  // else the point is that it does. Either way, an editor that strips the
  // source on save makes the pair test its own control and pass for free -
  // which is precisely why every one of them is listed.
  //
  // The `.html` column is empty wherever the rule is that the run is DROPPED:
  // the expected output has no trailing whitespace, by construction.
  { base: '268-trailing-whitespace-on-a-content-line-is-dropped', crv: ['trailing-WS'], html: [] },
  { base: '268-trailing-whitespace-on-a-content-line-is-dropped-2', crv: ['trailing-WS'], html: [] },
  { base: '268-trailing-whitespace-on-a-content-line-is-dropped-3', crv: ['trailing-WS'], html: [] },
  { base: '268-trailing-whitespace-on-a-content-line-is-dropped-4', crv: ['trailing-WS'], html: [] },
  { base: '268-trailing-whitespace-on-a-content-line-is-dropped-5', crv: ['trailing-WS'], html: [] },
  { base: '268-trailing-whitespace-on-a-content-line-is-dropped-6', crv: ['trailing-WS'], html: [] },
  // The nine-character class document, and the one that carries the most. Each
  // line ends in a DIFFERENT character that is not `whitespace`, so each one
  // survives - and the NBSP is spelled `&nbsp;` in the expected HTML while the
  // other four are raw on both sides.
  {
    base: '268-trailing-whitespace-on-a-content-line-is-dropped-7',
    crv: ['NBSP', 'ZWSP', 'BOM', 'EN-QUAD', 'FF'],
    html: ['ZWSP', 'BOM', 'EN-QUAD', 'FF'],
  },
  // The shape the ticket was raised on: <SP> U+FEFF <SP>. The BOM is content
  // and survives; the trailing space is the thing that must not.
  {
    base: '268-trailing-whitespace-on-a-content-line-is-dropped-8',
    crv: ['BOM', 'trailing-WS'],
    html: ['BOM'],
  },
  // A code fence body, where the run is the block's PAYLOAD and is kept - so
  // this one is the control that the rule does not reach verbatim content, and
  // its trailing whitespace has to survive on BOTH sides.
  {
    base: '268-trailing-whitespace-on-a-content-line-is-dropped-9',
    crv: ['trailing-WS'],
    html: ['trailing-WS'],
  },
  // The line block. SS23 converts the two-column run into NBSPs, so the `.crv`
  // carries the run and the `.html` carries the entities rather than a run.
  { base: '268-trailing-whitespace-on-a-content-line-is-dropped-12', crv: ['trailing-WS'], html: [] },
  // The definition term's continuation line (markup-carve/carve#1289). The
  // trailing space is the whole case: strip it from the `.crv` and the pair
  // asserts nothing, because the term already renders that way without it.
  { base: '268-trailing-whitespace-on-a-content-line-is-dropped-13', crv: ['trailing-WS'], html: [] },
  // carve#844's category. The invisible character IS the assertion in each of
  // these three: it is the one thing keeping the line from being an autolink,
  // so an editor that strips it turns the pair into the plain `<https://e.com/>`
  // control, which links - and the expected HTML would then be wrong rather
  // than merely weak, so this is not a silent-decay shape. It is listed for the
  // same reason anyway: the `.html` carries the character raw too, because the
  // line renders as escaped literal TEXT and the text contains it.
  {
    base: '272-an-autolink-body-admits-non-ascii-and-excludes-format-characters-4',
    crv: ['BOM'],
    html: ['BOM'],
  },
  {
    base: '272-an-autolink-body-admits-non-ascii-and-excludes-format-characters-5',
    crv: ['BOM'],
    html: ['BOM'],
  },
  {
    base: '272-an-autolink-body-admits-non-ascii-and-excludes-format-characters-6',
    crv: ['ZWSP'],
    html: ['ZWSP'],
  },
  // The NBSP is spelled `&nbsp;` in the expected HTML, so it is not listed on
  // that side.
  {
    base: '272-an-autolink-body-admits-non-ascii-and-excludes-format-characters-7',
    crv: ['NBSP'],
    html: [],
  },
  // The BOM is in the DESTINATION here, and this pair is the CONTROL that
  // `link_destination` did not move: strip it and the pair becomes an ordinary
  // inline link, which is pinned a dozen times over and would pass for free.
  {
    base: '272-an-autolink-body-admits-non-ascii-and-excludes-format-characters-9',
    crv: ['BOM'],
    html: ['BOM'],
  },
  // The TRAILING TAB is the case in both of these (markup-carve/carve#1295):
  // the opener is a fence in one and a frontmatter delimiter in the other, and
  // each says the tab is dropped rather than read as a separator. Strip it and
  // the document becomes the bare opener, which every other fence and
  // frontmatter pair already pins - so the fixture would pass for free while
  // asserting the opposite of what it is here to assert. The two SEPARATOR
  // cases beside them carry their tab mid-line, where nothing cleans it up.
  {
    base: '330-a-tab-after-a-fence-or-a-frontmatter-opener-depends-on-where-it-sits-2',
    crv: ['trailing-WS', 'trailing-TAB'],
    html: [],
  },
  {
    base: '330-a-tab-after-a-fence-or-a-frontmatter-opener-depends-on-where-it-sits-4',
    crv: ['trailing-WS', 'trailing-TAB'],
    html: [],
  },
  // The NUL byte IS the case, and only on the input side: the expected HTML
  // carries U+FFFD, which is what the byte becomes at the parse boundary. Both
  // documents are generated by the `nul` byte transform in
  // scripts/generate-corpus.mjs rather than written into the example source,
  // for the reason stated there - a U+0000 in resources/examples/edge-cases.md
  // would make that whole file binary to git.
  { base: '397-a-null-byte-is-replaced-before-the-document-is-read', crv: ['NUL'], html: [] },
  { base: '397-a-null-byte-is-replaced-before-the-document-is-read-2', crv: ['NUL'], html: [] },
  // The control beside them: a vertical tab is a C0 control that is NOT carved
  // out, so it is raw on BOTH sides and would decay silently.
  {
    base: '397-a-null-byte-is-replaced-before-the-document-is-read-3',
    crv: ['VT'],
    html: ['VT'],
  },
  {
    base: '379-a-reference-definition-cannot-take-its-destination-from-the-next-line',
    crv: ['trailing-WS'],
    html: [],
  },
  {
    base: '379-a-reference-definition-cannot-take-its-destination-from-the-next-line-2',
    crv: ['trailing-WS'],
    html: [],
  },
]

function scan(text) {
  const found = new Set()
  for (const ch of text) {
    const name = WATCHED.get(ch.codePointAt(0))
    if (name) found.add(name)
  }
  if (/[ \t]+$/m.test(text)) found.add('trailing-WS')
  // WHICH trailing whitespace, where the two are not interchangeable. Most
  // pairs here only need the run to survive, and `trailing-WS` says that. The
  // tab-position pairs need the run to survive AS A TAB: a formatter that
  // expands it to spaces leaves a document whose expected HTML is unchanged -
  // the space form of the same opener is pinned separately and renders
  // identically - so both this file and the corpus test would stay green while
  // the fixture quietly became a duplicate of its own control (carve#1295).
  // Listing `trailing-TAB` is what makes that expansion visible. It is a
  // narrowing of `trailing-WS`, never a replacement: entries assert the names
  // they need and the completeness set is unchanged either way.
  if (/\t+$/m.test(text)) found.add('trailing-TAB')
  // CARRIAGE RETURNS, which this file existed to protect and could not see.
  // Every other watched character is exotic enough that no tool touches it by
  // accident; a CR is the one byte git itself rewrites on checkout, under a
  // setting the contributor may not know is on. It is not in WATCHED because
  // that map is per-codepoint and would call a CRLF document a lone-CR one.
  if (text.includes('\r\n')) found.add('CRLF')
  if (/\r(?!\n)/.test(text)) found.add('CR')
  return found
}

function read(base, ext) {
  return readFileSync(resolve(corpusDir, `${base}.${ext}`), 'utf8')
}

for (const { base, crv, html } of INVENTORY) {
  test(`fixture keeps its significant bytes: ${base}`, () => {
    const inCrv = scan(read(base, 'crv'))
    for (const want of crv) {
      assert.ok(
        inCrv.has(want),
        `${base}.crv lost ${want}. That character is the assertion, not incidental ` +
          `whitespace - it was probably stripped by an editor or formatter. Restore it ` +
          `(see .editorconfig / .gitattributes, which exist to prevent exactly this).`,
      )
    }
    const inHtml = scan(read(base, 'html'))
    for (const want of html) {
      assert.ok(
        inHtml.has(want),
        `${base}.html lost ${want}. This pair carries the character raw on BOTH sides, ` +
          `so losing it from both would keep the corpus test GREEN while testing nothing.`,
      )
    }
  })
}

// Catches a fixture that gains invisible characters without being pinned here,
// and a pinned fixture that loses them entirely (it would drop out of the scan).
test('the inventory of fixtures carrying invisible characters is complete', () => {
  const actual = []
  for (const file of readdirSync(corpusDir).filter((f) => f.endsWith('.crv')).sort()) {
    const base = file.slice(0, -4)
    if (scan(readFileSync(resolve(corpusDir, file), 'utf8')).size > 0) actual.push(base)
  }
  const expected = INVENTORY.map((e) => e.base).sort()
  assert.deepEqual(
    actual.sort(),
    expected,
    'Corpus fixtures carrying invisible or whitespace-significant characters have changed. ' +
      'If you ADDED such a fixture, add it to INVENTORY here so its bytes are pinned. ' +
      'If one DISAPPEARED, its significant character was stripped - restore it.',
  )
})
