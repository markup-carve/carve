/*
 * The divergences in docs/divergence-from-djot.md are real, and still real.
 *
 * That page makes concrete, falsifiable claims about how Carve differs from
 * Djot, and nothing checked any of them. It is the reference authors reach for
 * when porting a document, and a stale entry there is worse than a missing one:
 * it describes a difference that no longer exists, and every reader believes it.
 *
 * The risk is not hypothetical. Section 13 had to be rewritten when the
 * exact-length closer work made Carve CONVERGE with Djot on two of the three
 * points it documented - equal-length fences and unclosed containers both went
 * from "diverges" to "agrees". Nothing failed; a person noticed.
 *
 * Each case below pins the OBSERVABLE claim - do the two engines differ, or
 * agree - rather than either engine's exact output, which the corpus already
 * pins for Carve and which is not this file's business. A case marked
 * `differs: false` is one the page explicitly says behaves the SAME in both,
 * so a future change that accidentally introduces a divergence there also
 * fails here.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse as djotParse, renderHTML as djotRender } from '@djot/djot'
import { carveToHtml, parse as carveParse } from '@markup-carve/carve'

const normalize = (html) => html.replace(/\s+/g, ' ').trim()

/**
 * section: where the claim lives, so a failure names the paragraph to fix.
 * differs: what the page says - true means Carve and Djot disagree here.
 */
/*
 * Section 12 is asserted separately at the AST layer because both shapes
 * deliberately render identical HTML.
 *
 * Section 5b's "> > quoted" case is absent for a duller reason: both engines
 * nest it, which is the claim, but they pretty-print the nesting differently
 * (`<blockquote><p>` against `<blockquote> <p>`), and this file compares
 * whitespace-squashed HTML.
 */
const CLAIMS = [
  { section: '1', input: '# Getting Started\n', differs: false, note: 'the emitted id is deliberately Djot-shaped - the divergence is in RESOLUTION, not the slug' },
  { section: '1', input: '# My API Reference\n\nSee </#my-api-reference>\n', differs: true, note: 'Carve resolves its added case-insensitive cross-reference syntax' },
  { section: '1b', input: '# a; b: c\n', differs: true, note: 'Carve keeps alphanumerics only, so a-b-c against Djot a;-b:-c' },
  { section: '1c', input: '{a=b .c #x}\n# abc\n', differs: true, note: 'with an explicit id, Carve keeps non-id attributes on the heading; Djot moves them to the section' },
  { section: '6', input: '%% a comment\n', differs: true, note: 'Carve has plain-text comments; Djot renders the line' },
  { section: '7', input: 'text\n# Heading\n', differs: false, note: 'both require block position after an open paragraph' },
  { section: '11', input: '1. one\n\n  > quoted\n', differs: true, note: 'below the content column the block detaches in Carve, attaches in Djot' },
  { section: '2', input: '-\n', differs: true, note: 'a bare marker is a paragraph in Carve, an empty item in Djot' },
  { section: '3', input: '+ text\n', differs: true, note: '+ is the continuation marker in Carve, a bullet in Djot' },
  { section: '4', input: '/italic/\n', differs: true, note: 'slashes are emphasis in Carve only' },
  { section: '4', input: '_underline_\n', differs: true, note: 'underscores are underline in Carve, emphasis in Djot' },
  { section: '4', input: '=marked=\n', differs: true, note: 'bare = is highlight in Carve only' },
  { section: '4', input: '*bold*\n', differs: false, note: 'strong is the one emphasis both spell the same way' },
  { section: '5', input: '(1) one\n', differs: true, note: 'parenthesized ordered markers are prose in Carve' },
  { section: '9', input: ':: term\n:  def\n', differs: true, note: 'Carve definition lists use explicit markers' },
  { section: '10', input: '`x`{=html}\n', differs: false, note: 'both route matching raw HTML to the HTML renderer' },
  { section: '10', input: '`x`{=latex}\n', differs: false, note: 'both drop raw content for a non-matching HTML target' },
  // Section 13's equal-length-nesting claim is deliberately NOT here. It is
  // true, and it is not expressible as HTML equality: nesting needs a TYPED
  // inner fence (a bare one matches the opener and closes it), and Carve
  // renders a typed fence as `<aside class="admonition ...">` where Djot
  // renders `<div class="...">`. The two agree on the structure and differ on
  // the element name for an unrelated reason, so asserting either way here
  // would pin the wrong thing. Pinned instead by the corpus, as
  // 68-nested-containers-2.
  { section: '13', input: ':::\nX\n', differs: false, note: 'an unclosed container closes at end of input in BOTH' },
  { section: '13', input: ':::\nOuter\n\n::::\nInner\n::::\n:::\n', differs: true, note: 'widening inward nests in Carve, closes the outer in Djot' },
  { section: '14', input: '# One\ntwo\n', differs: true, note: 'a heading ends at the newline in Carve, folds in Djot' },
]

for (const { section, input, differs, note } of CLAIMS) {
  test(`divergence-from-djot section ${section}: ${note}`, () => {
    const carve = normalize(carveToHtml(input))
    const djot = normalize(djotRender(djotParse(input)))
    if (differs) {
      assert.notEqual(
        carve,
        djot,
        `section ${section} documents a divergence that no longer exists.\n` +
          `  input: ${JSON.stringify(input)}\n  both now render: ${carve}\n` +
          `  Update docs/divergence-from-djot.md - the page is the thing that is wrong here, not this test.`,
      )
    } else {
      assert.equal(
        carve,
        djot,
        `section ${section} says these agree, and they no longer do.\n` +
          `  input: ${JSON.stringify(input)}\n  carve: ${carve}\n  djot:  ${djot}`,
      )
    }
  })
}

test('divergence-from-djot section 12: smart quotes are leaves rather than containers', () => {
  const djotQuote = djotParse('"hello"\n').children[0].children[0]
  const carveChildren = carveParse('"hello"\n').children[0].children

  assert.equal(djotQuote.tag, 'double_quoted')
  assert.ok(Array.isArray(djotQuote.children), 'Djot quote must remain a container for this claim')
  assert.deepEqual(
    carveChildren.map((node) => node.type),
    ['smart_punctuation', 'text', 'smart_punctuation'],
  )
  assert.ok(carveChildren.every((node) => !('children' in node)), 'Carve quote parts must remain leaves')
})

test('divergence-from-djot section 8: symbols cannot open inside words', () => {
  const djotChildren = djotParse('a:b:c\n').children[0].children
  const carveChildren = carveParse('a:b:c\n').children[0].children

  assert.equal(djotChildren[1].tag, 'symb')
  assert.deepEqual(carveChildren.map((node) => [node.type, node.value]), [['text', 'a:b:c']])
})

test('every claim names a section that exists in the page', async () => {
  const { readFileSync } = await import('node:fs')
  const page = readFileSync(new URL('../docs/divergence-from-djot.md', import.meta.url), 'utf8')
  for (const { section } of CLAIMS) {
    assert.ok(
      new RegExp(`^## ${section}\\.`, 'm').test(page),
      `no "## ${section}." heading in divergence-from-djot.md - a claim here outlived the section it came from`,
    )
  }
})

test('every numbered divergence has an audited justification row', async () => {
  const { readFileSync } = await import('node:fs')
  const page = readFileSync(new URL('../docs/divergence-from-djot.md', import.meta.url), 'utf8')
  const sections = [...page.matchAll(/^## (\d+(?:[a-z])?)\. /gm)].map((match) => match[1])
  const inventory = page.slice(
    page.indexOf('## Audited divergence inventory'),
    page.indexOf('## 1. Case-preserving'),
  )

  assert.deepEqual(sections, [
    '1', '1b', '1c', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14',
  ])
  for (const section of sections) {
    assert.match(
      inventory,
      new RegExp(`^\\| ${section}\\. `, 'm'),
      `divergence section ${section} has no audited reason`,
    )
  }

  const executableSections = new Set([...CLAIMS.map(({ section }) => section), '8', '12'])
  assert.deepEqual(
    sections.filter((section) => !executableSections.has(section)),
    [],
    'every inventory item must have a direct Djot comparison in this file',
  )
})
