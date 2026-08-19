/**
 * Every ```carve sample in an authored docs page must actually parse.
 *
 * WHY. `tests/examples.test.mjs` guards the free-form `.crv` files the
 * Playground imports, and the corpus guards every `::: compare` pair. Between
 * them sat the samples written inline in prose - the home page alone carried
 * fourteen - which nothing rendered. They are the first Carve a visitor reads
 * and the most likely to rot, because a syntax change updates the corpus and
 * the engines while a hand-written snippet in a paragraph just sits there.
 *
 * The checks are the ones examples.test.mjs already found worth making: a
 * construct that still PARSES but renders wrong, so nothing throws and the
 * breakage ships silently.
 *
 * Generated pages are excluded - their samples come from the corpus, which is
 * verified against the oracle already.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml } from '@markup-carve/carve'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const files = execFileSync('git', ['ls-files', 'docs'], { cwd: repoRoot, encoding: 'utf8' })
  .split('\n')
  .filter((path) => path.endsWith('.md') && !path.startsWith('docs/examples/'))

/*
 * Only fences opened exactly ```carve are samples. A widened fence (````carve)
 * is usually a sample ABOUT fences, whose body is deliberately not a document
 * on its own.
 */
const samplesIn = (text) => {
  const out = []
  let open = false
  let buffer = []
  for (const line of text.split('\n')) {
    if (!open && /^```carve\s*$/.test(line)) {
      open = true
      buffer = []
      continue
    }
    if (open && /^```\s*$/.test(line)) {
      out.push(buffer.join('\n'))
      open = false
      continue
    }
    if (open) buffer.push(line)
  }

  return out
}

/*
 * A line that OPENS a block, at column 0 where the language requires it.
 *
 * Column 0 on purpose: a marker indented past its container's content column is
 * literal paragraph text by design, so a sample demonstrating that is not a
 * sample that failed - anchoring here keeps the check off it.
 *
 * Two groups, because paragraph interruption is not uniform and a check that
 * pretended it was would fire on the samples that TEACH the difference. A table
 * row, heading, quote, `:::` fence, code fence, definition marker or thematic
 * break interrupts an open paragraph; a list marker does not - it folds in as
 * lazy continuation (PART 10), which is the whole subject of the paragraph
 * interruption section in docs/parsing-ambiguities.md. So a list marker only
 * counts as an opener where a list can actually start: at the top of the sample
 * or after a blank line. Each row of this split is pinned by measurement in the
 * discriminator test below.
 *
 * A caption line (`^ `) is in neither group: it folds into a paragraph like a
 * list marker AND it needs a captionable block above it, which is already in
 * the first group.
 */
const INTERRUPTS = /^(\|=?|#{1,6} |> |:::|```|:: |(-{3,}|\*{3,}|_{3,})\s*$)/m
const LIST_OPENER = /(^|\n[ \t]*\n)([-*+] |\d+[.)] |\. )/
const opensABlock = (source) => INTERRUPTS.test(source) || LIST_OPENER.test(source)

/*
 * What proves a block was actually built. Deliberately a FLOOR and not a
 * per-marker mapping: the failure this exists for is total collapse - every row
 * of a table, every `:::` container, the whole sample coming back as prose -
 * and a floor cannot rot the way a marker table would.
 */
const BUILT_A_BLOCK = /<(h[1-6]|table|blockquote|ul|ol|dl|div|aside|figure|hr|pre|section)\b/

const samples = files.flatMap((file) =>
  samplesIn(readFileSync(resolve(repoRoot, file), 'utf8')).map((source, index) => ({
    file,
    index: index + 1,
    source,
  })),
)

test('the docs carry carve samples to check', () => {
  /* A broken scan would make every assertion below pass over nothing. */
  assert.ok(samples.length >= 20, `expected inline carve samples, found ${samples.length}`)
})

test('the block-opener and block-built patterns still discriminate', () => {
  /*
   * Both patterns are what every assertion below rests on, and either one
   * silently matching nothing (or everything) would make the sweep vacuous.
   */
  const annotated = '|= Header |= Header |        (|= marks a header cell)'
  assert.ok(opensABlock(annotated), 'a table row must read as a block opener')
  assert.ok(!BUILT_A_BLOCK.test(carveToHtml(annotated)), 'the annotated row must build no block')
  assert.ok(BUILT_A_BLOCK.test(carveToHtml('|= Header |\n| Cell |')), 'a real table must build one')
  assert.ok(!opensABlock('{#the-id .class}'), 'an attribute block opens no block')

  /*
   * The interrupt split is a claim about the language, so it is measured
   * against the engine rather than asserted from the pattern. Each marker is
   * put after a prose line: the first group must still build its block, and a
   * list marker must not - if that ever changes, this fails here instead of
   * quietly firing on the samples that document the difference.
   */
  for (const marker of ['| a | b |', '# H', '> q', '::: note\nbody\n:::', '```\nc\n```', ':: t\n:  d', '---']) {
    const html = carveToHtml(`prose line\n${marker}`)
    assert.ok(BUILT_A_BLOCK.test(html), `${JSON.stringify(marker)} must interrupt a paragraph`)
    assert.ok(INTERRUPTS.test(marker), `${JSON.stringify(marker)} must be in the interrupting group`)
  }
  for (const marker of ['- item', '* item', '1. item', '^ cap']) {
    assert.ok(
      !BUILT_A_BLOCK.test(carveToHtml(`prose line\n${marker}`)),
      `${JSON.stringify(marker)} must fold into the paragraph above it`,
    )
    assert.ok(!opensABlock(`prose line\n${marker}`), `${JSON.stringify(marker)} must not count as an opener there`)
  }
  assert.ok(opensABlock('- item'), 'a list marker at the top of a sample does open a list')
  assert.ok(opensABlock('prose\n\n- item'), 'a list marker after a blank line does too')
})

for (const { file, index, source } of samples) {
  test(`${file} carve sample ${index} renders`, () => {
    let html
    assert.doesNotThrow(() => {
      html = carveToHtml(source)
    }, `${file} sample ${index} threw`)

    /*
     * A paragraph that begins with a block marker is a block construct that
     * failed to parse and leaked as text - the signature of a sample written
     * against syntax the language no longer has.
     */
    const leak = html.replace(/<pre>[\s\S]*?<\/pre>/g, '').match(/<p[^>]*>\s*(:::|\{[#.]|\|=)/)
    assert.equal(leak, null, `${file} sample ${index}: block markup leaked as paragraph text: ${leak?.[0]}`)

    /*
     * The failure the check above cannot see. A sample written in the cheat
     * sheet's annotated style - the construct on the left, its explanation in a
     * right-hand column - parses without throwing and without leaking anything
     * the pattern above recognizes: the trailing parenthetical simply means the
     * line no longer ends a row, so every row becomes prose. Nothing was
     * malformed, so nothing complained, and the page teaching the syntax showed
     * samples that do something else when pasted (markup-carve/carve#1247).
     *
     * A sample that opens a block and renders no block is that failure. Such a
     * block is notation, not a document - tag it ```text so no reader pastes it
     * expecting output, rather than waiving it here.
     */
    if (opensABlock(source)) {
      assert.ok(
        BUILT_A_BLOCK.test(html),
        `${file} sample ${index}: opens a block and renders none - it came back as prose. ` +
          `If it is annotated notation rather than a document, tag the fence \`\`\`text.`,
      )
    }
  })
}
