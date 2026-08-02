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
import { carveToHtml } from '@markup-carve/carve'

const normalize = (html) => html.replace(/\s+/g, ' ').trim()

/**
 * section: where the claim lives, so a failure names the paragraph to fix.
 * differs: what the page says - true means Carve and Djot disagree here.
 */
const CLAIMS = [
  { section: '2', input: '-\n', differs: true, note: 'a bare marker is a paragraph in Carve, an empty item in Djot' },
  { section: '3', input: '+ text\n', differs: true, note: '+ is the continuation marker in Carve, a bullet in Djot' },
  { section: '4', input: '/italic/\n', differs: true, note: 'slashes are emphasis in Carve only' },
  { section: '4', input: '_underline_\n', differs: true, note: 'underscores are underline in Carve, emphasis in Djot' },
  { section: '4', input: '=marked=\n', differs: true, note: 'bare = is highlight in Carve only' },
  { section: '4', input: '*bold*\n', differs: false, note: 'strong is the one emphasis both spell the same way' },
  { section: '5', input: '(1) one\n', differs: true, note: 'parenthesized ordered markers are prose in Carve' },
  { section: '9', input: ':: term\n:  def\n', differs: true, note: 'Carve definition lists use explicit markers' },
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
