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
 * Samples that are annotated syntax DIAGRAMS rather than documents: the cheat
 * sheet writes the construct on the left and its explanation in a column on the
 * right, so the block never was a parseable document and rendering it proves
 * nothing.
 *
 * Keyed by a substring rather than only an index, so inserting a sample above
 * one of these fails loudly instead of silently waiving a different block.
 */
const ANNOTATED = [
  { file: 'docs/cheatsheet.md', index: 1, contains: '(|= marks a header cell' },
]

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

test('every annotated-sample waiver still names that sample', () => {
  for (const waiver of ANNOTATED) {
    const sample = samples.find((s) => s.file === waiver.file && s.index === waiver.index)
    assert.ok(sample, `waiver names ${waiver.file} sample ${waiver.index}, which does not exist`)
    assert.ok(
      sample.source.includes(waiver.contains),
      `waiver for ${waiver.file} sample ${waiver.index} no longer matches - a sample was probably inserted above it`,
    )
  }
})

const waived = (file, index) => ANNOTATED.some((w) => w.file === file && w.index === index)

for (const { file, index, source } of samples) {
  test(`${file} carve sample ${index} renders`, { skip: waived(file, index) ? 'annotated syntax diagram, not a document' : false }, () => {
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
  })
}
