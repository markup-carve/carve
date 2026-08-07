/*
 * `url_char`'s CHARACTER CLASSES, pinned by codepoint rather than by bytes.
 *
 * The corpus pins the readable half of carve#844's rule - an internationalized
 * domain, a non-ASCII path, a non-ASCII non-letter, a byte order mark, a
 * zero-width space, a no-break space. It cannot reasonably pin the rest:
 *
 *   - a CONTROL character (U+0001, U+007F, the C1 block) in
 *     docs/examples/edge-cases.md is invisible in review and one editor save
 *     from vanishing, and unlike the characters in tests/fixture-bytes.test.mjs
 *     it has no WATCHED entry to notice the loss;
 *   - the FORMAT category has 170 codepoints in 21 ranges, and pinning one of
 *     each as a corpus document would be 170 documents stating one rule.
 *
 * So the class is asserted here, over a table built with String.fromCodePoint -
 * no invisible byte in any source file. Both the ADMITTED and the REJECTED
 * sides are listed, because a rule that only ever sees rejections is satisfied
 * by an autolink production that matches nothing.
 *
 * The count of codepoints EXAMINED is asserted too, not just the count of
 * failures. A table that silently lost its rows would otherwise report a clean
 * run, which is the failure this file exists to prevent (carve#755).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const cp = (n) => String.fromCodePoint(n)
const isAutolink = (src) => /<a href=/.test(renderDoc(parse(src + '\n')))
/** The character sits between the host and its TLD, where it is invisible. */
const inBody = (ch) => `<https://e${ch}.com/>`

// ADMITTED: outside ASCII, not whitespace, not a format character. One per
// general category that a URL might plausibly carry, so the rule cannot be
// re-implemented as "Unicode letters" and stay green.
const ADMITTED = [
  [0x00e9, 'LATIN SMALL LETTER E WITH ACUTE (Ll)'],
  [0x4f8b, 'CJK IDEOGRAPH (Lo)'],
  [0x0301, 'COMBINING ACUTE ACCENT (Mn)'],
  [0x0663, 'ARABIC-INDIC DIGIT THREE (Nd)'],
  [0x2160, 'ROMAN NUMERAL ONE (Nl)'],
  [0x3001, 'IDEOGRAPHIC COMMA (Po)'],
  [0x2013, 'EN DASH (Pd)'],
  [0x20ac, 'EURO SIGN (Sc)'],
  [0x221a, 'SQUARE ROOT (Sm)'],
  [0x1f600, 'GRINNING FACE (So, astral)'],
  [0xe000, 'PRIVATE USE (Co)'],
  [0x0378, 'UNASSIGNED (Cn)'],
]

// REJECTED, half one: General_Category=Cf. One from each BMP range of the
// property plus one astral range, so the surrogate-pair guard is exercised.
const FORMAT = [
  [0x00ad, 'SOFT HYPHEN'],
  [0x0601, 'ARABIC SIGN SANAH'],
  [0x061c, 'ARABIC LETTER MARK'],
  [0x06dd, 'ARABIC END OF AYAH'],
  [0x070f, 'SYRIAC ABBREVIATION MARK'],
  [0x0890, 'ARABIC POUND MARK ABOVE'],
  [0x08e2, 'ARABIC DISPUTED END OF AYAH'],
  [0x180e, 'MONGOLIAN VOWEL SEPARATOR'],
  [0x200b, 'ZERO WIDTH SPACE'],
  [0x200e, 'LEFT-TO-RIGHT MARK'],
  [0x202e, 'RIGHT-TO-LEFT OVERRIDE'],
  [0x2060, 'WORD JOINER'],
  [0x2066, 'LEFT-TO-RIGHT ISOLATE'],
  [0xfeff, 'ZERO WIDTH NO-BREAK SPACE (BOM)'],
  [0xfff9, 'INTERLINEAR ANNOTATION ANCHOR'],
  [0x110bd, 'KAITHI NUMBER SIGN (astral)'],
  [0x13430, 'EGYPTIAN HIEROGLYPH VERTICAL JOINER (astral)'],
  [0x1bca0, 'SHORTHAND FORMAT LETTER OVERLAP (astral)'],
  [0x1d173, 'MUSICAL SYMBOL BEGIN BEAM (astral)'],
  [0xe0001, 'LANGUAGE TAG (astral)'],
  [0xe0020, 'TAG SPACE (astral)'],
]

// REJECTED, half two: whitespace outside ASCII, and CONTROL characters. The
// control rows are the reason this file exists rather than a corpus document.
const NOT_URL_CHAR = [
  [0x0085, 'NEXT LINE (Cc + White_Space)'],
  [0x00a0, 'NO-BREAK SPACE (Zs)'],
  [0x1680, 'OGHAM SPACE MARK (Zs)'],
  [0x2009, 'THIN SPACE (Zs)'],
  [0x2028, 'LINE SEPARATOR (Zl)'],
  [0x2029, 'PARAGRAPH SEPARATOR (Zp)'],
  [0x202f, 'NARROW NO-BREAK SPACE (Zs)'],
  [0x3000, 'IDEOGRAPHIC SPACE (Zs)'],
  [0x0001, 'START OF HEADING (Cc)'],
  [0x0008, 'BACKSPACE (Cc)'],
  [0x001f, 'UNIT SEPARATOR (Cc)'],
  [0x007f, 'DELETE (Cc)'],
  [0x0080, 'PADDING CHARACTER (Cc, C1)'],
  [0x009f, 'APPLICATION PROGRAM COMMAND (Cc, C1)'],
]

// The ASCII exclusions this ruling did NOT move. Listed here so a later
// widening of the rule to "any non-whitespace, non-control character" - the
// reading PART 3 explicitly declines - cannot land green.
const ASCII_EXCLUDED = ['"', '\\', '`', '{', '}', '|', '^', '<']

test('a plain ASCII autolink links (the control that keeps the rest honest)', () => {
  assert.ok(isAutolink('<https://e.com/>'), 'the baseline autolink stopped linking')
})

test('outside ASCII, a non-whitespace non-format character is a url_char', () => {
  const missed = ADMITTED.filter(([n]) => !isAutolink(inBody(cp(n))))
  assert.deepEqual(
    missed.map(([n, name]) => `U+${n.toString(16).toUpperCase()} ${name}`),
    [],
    'these characters should be admitted by url_char and are not',
  )
  assert.equal(ADMITTED.length, 12, 'the ADMITTED table lost or gained rows')
})

test('a format character is not a url_char', () => {
  const linked = FORMAT.filter(([n]) => isAutolink(inBody(cp(n))))
  assert.deepEqual(
    linked.map(([n, name]) => `U+${n.toString(16).toUpperCase()} ${name}`),
    [],
    'a General_Category=Cf character opened an autolink - it is invisible, so the ' +
      'rendered host is not the host that was linked',
  )
  assert.equal(FORMAT.length, 21, 'the FORMAT table lost or gained rows')
})

test('whitespace and control characters are not url_chars', () => {
  const linked = NOT_URL_CHAR.filter(([n]) => isAutolink(inBody(cp(n))))
  assert.deepEqual(
    linked.map(([n, name]) => `U+${n.toString(16).toUpperCase()} ${name}`),
    [],
    'a whitespace or control character opened an autolink',
  )
  assert.equal(NOT_URL_CHAR.length, 14, 'the NOT_URL_CHAR table lost or gained rows')
})

test('the ASCII exclusions did not move', () => {
  const linked = ASCII_EXCLUDED.filter((ch) => isAutolink(`<https://e.com/a${ch}b>`))
  assert.deepEqual(linked, [], 'an enumerated ASCII exclusion became a url_char')
  assert.equal(ASCII_EXCLUDED.length, 8, 'the ASCII_EXCLUDED table lost or gained rows')
})

// `>` belongs to the same exclusion and cannot be tested the same way: it is
// the construct's own terminator, so a document containing one still produces
// an autolink - a SHORTER one. What must hold is that the character never
// reaches the body.
test('a closing angle bracket ends the body rather than joining it', () => {
  const html = renderDoc(parse('<https://e.com/a>b>\n'))
  assert.match(html, /<a href="https:\/\/e\.com\/a">/, 'the href swallowed the terminator')
  assert.match(html, /b&gt;/, 'the remainder should be literal text after the autolink')
})

test('a scheme is ASCII even though the body is not', () => {
  assert.ok(!isAutolink('<\u4f8b://e.com/>'), 'a non-ASCII scheme opened an autolink')
  assert.ok(isAutolink('<https://\u4f8b.jp/>'), 'the same character in the BODY must still link')
})

test('link_destination is a different production and still admits a format character', () => {
  const html = renderDoc(parse(`[t](https://e${cp(0xfeff)}.com/)\n`))
  assert.match(html, /<a href="https:\/\/e\ufeff\.com\/">/, 'the inline destination lost the character')
})

test('every codepoint the tables name was actually examined', () => {
  // Zero findings from zero rows reads exactly like a clean run. This asserts
  // the denominator: each table row is rendered once, and the totals below are
  // what the four tests above walked.
  const examined = ADMITTED.length + FORMAT.length + NOT_URL_CHAR.length + ASCII_EXCLUDED.length
  assert.equal(examined, 55, 'the number of characters this file examines changed')
  const codepoints = new Set([...ADMITTED, ...FORMAT, ...NOT_URL_CHAR].map(([n]) => n))
  assert.equal(codepoints.size, 47, 'a codepoint is listed twice, so one row tests nothing new')
})
