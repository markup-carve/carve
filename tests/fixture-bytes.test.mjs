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
  { base: '84-single-line-headings-5', crv: ['trailing-WS'], html: [] },
]

function scan(text) {
  const found = new Set()
  for (const ch of text) {
    const name = WATCHED.get(ch.codePointAt(0))
    if (name) found.add(name)
  }
  if (/[ \t]+$/m.test(text)) found.add('trailing-WS')
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
