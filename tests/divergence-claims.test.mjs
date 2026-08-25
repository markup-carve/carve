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
/*
 * Sections deliberately absent, and why - so their absence reads as a decision
 * rather than an oversight:
 *
 *   8  (symbols)            both engines leave `:tada:` literal with no symbol
 *                           map configured, so the stricter-boundary claim
 *                           needs option plumbing to observe at all.
 *   10 (raw passthrough)    both emit a matching format and drop a
 *                           non-matching one; the divergence is in WHICH
 *                           spellings are accepted, not in the output of the
 *                           shared one.
 *   12 (smart punctuation)  explicitly an AST-shape claim - one leaf node
 *                           against three container types - and both render
 *                           identical HTML. Nothing to see at this layer.
 *
 * Section 5b's "> > quoted" case is absent for a duller reason: both engines
 * nest it, which is the claim, but they pretty-print the nesting differently
 * (`<blockquote><p>` against `<blockquote> <p>`), and this file compares
 * whitespace-squashed HTML.
 *
 * Section 21 (footnote labels) is absent for the same kind of reason, and it is
 * worth spelling out because the entry LOOKS testable here. Any input carrying
 * a resolved footnote already differs between the two engines: the backlink
 * glyph is `↩` in Carve and `↩︎` (with a variation selector) in Djot. So
 * `differs: true` passes for every footnote input whether or not the label
 * matched, which is a check that cannot fail - the exact shape this file
 * exists to avoid. The binding behavior is pinned by the corpus instead
 * (22-footnotes-6 for the wrapped reference).
 */
const CLAIMS = [
  { section: '1', input: '# Getting Started\n', differs: false, note: 'the emitted id is deliberately Djot-shaped - the divergence is in RESOLUTION, not the slug' },
  { section: '1b', input: '# a; b: c\n', differs: true, note: 'Carve keeps alphanumerics only, so a-b-c against Djot a;-b:-c' },
  { section: '1c', input: '{a=b .c #x}\n# abc\n', differs: true, note: 'with an explicit id, Carve keeps non-id attributes on the heading; Djot moves them to the section' },
  { section: '6', input: '%% a comment\n', differs: true, note: 'Carve has plain-text comments; Djot renders the line' },
  { section: '7', input: 'text\n# Heading\n', differs: true, note: 'a block opener interrupts a paragraph in Carve' },
  { section: '11', input: '1. one\n\n  > quoted\n', differs: true, note: 'below the content column the block detaches in Carve, attaches in Djot' },
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
  { section: '15', input: ' # H\n', differs: true, note: 'an indented block opener is prose in Carve, a heading in Djot' },
  { section: '15', input: '>\tq\n', differs: true, note: 'a tab does not satisfy the quote separator in Carve' },
  { section: '16', input: '[x]{12=v}\n', differs: true, note: 'a generic attribute name may not start with a digit in Carve, so the braces stay literal' },
  { section: '17', input: '-{.c} x\n', differs: true, note: 'the attribute block binds to the marker in Carve, to a span in Djot' },
  { section: '18', input: 'intro\n{.c}\n# H\n', differs: true, note: 'Djot consumes the attribute line and drops the bytes; Carve applies them to the block below' },
  { section: '19', input: '- a\n\n  > q\n', differs: true, note: 'an attached quote leaves the item tight in Carve, loose in Djot' },
  { section: '19', input: '- a\n\n  # H\n', differs: true, note: 'same for an attached heading' },
  // A nested LIST is the boundary of section 19's claim and is NOT listed here.
  // Both languages leave that item tight - neither emits `<li><p>` - so the
  // claim genuinely does not extend to it. It is not expressible as HTML
  // equality either: the two pretty-print the nesting differently (`<li> a` vs
  // `<li>a`), so `differs: false` fails on whitespace while `differs: true`
  // would assert a divergence that is not there. Same shape as the section 13
  // nesting claim above. The scope is stated in the page instead.
  { section: '20', input: '::: note\nbody\n:::\n', differs: true, note: 'a recognized type renders as a native admonition in Carve, a plain div in Djot' },
  { section: '6', input: '%%%\nx\n', differs: true, note: 'an unterminated comment fence degrades to a line comment in Carve; Djot renders the bytes' },
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
