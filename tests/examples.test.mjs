/**
 * Validates the free-form Carve example files that the docs ship and the
 * playground / dogfood preview import (docs/.vitepress/examples/*.crv).
 *
 * These files are NOT covered by the spec-corpus conformance suite: they are
 * prose documents, not compare-block fixtures. Yet they are the first Carve a
 * visitor sees. The danger is a construct that still *parses* but renders
 * wrong, so nothing throws and the breakage ships silently. Two real cases
 * this guards against:
 *   - a heading written `## Title {#id}` — the trailing `{...}` is literal
 *     text in Carve, so the id never attaches (use a `{#id}` line ABOVE it);
 *   - an invalid fence info string (e.g. ```raw html instead of ```=html)
 *     that desyncs fence pairing and dumps the rest of the document into a
 *     code block as raw text.
 *
 * Each example is rendered through the pinned carve-js build, linted for those
 * signatures, then byte-compared against a committed golden snapshot so any
 * other drift surfaces as a reviewable diff. Regenerate snapshots after an
 * intentional edit with `npm run examples:snapshot`.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml } from '@markup-carve/carve'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const examplesDir = resolve(repoRoot, 'docs/.vitepress/examples')
const snapDir = resolve(__dirname, 'examples')
const UPDATE = process.env.UPDATE_EXAMPLES === '1'

// Drop fenced/inline code so the prose checks below ignore deliberate
// demonstrations of Carve markup (a ```carve block, a `:::` code span, etc.).
const stripCode = (html) =>
  html.replace(/<pre>[\s\S]*?<\/pre>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '')

const files = readdirSync(examplesDir).filter((f) => f.endsWith('.crv')).sort()

assert.ok(files.length > 0, `no .crv examples found in ${examplesDir}`)

for (const file of files) {
  test(`example ${file} renders without silent breakage`, () => {
    const src = readFileSync(resolve(examplesDir, file), 'utf8')

    let html
    assert.doesNotThrow(() => {
      html = carveToHtml(src)
    }, `carve failed to render ${file}`)

    // 1. A heading must never render a literal attribute block. Trailing
    //    {#id}/{.class} on a heading line is ordinary text in Carve, so a
    //    match means the (removed) trailing-attr form was used instead of a
    //    preceding block-attribute line. The `.class` form survives as literal
    //    text (`{.featured}`); the `#id`/`@user` forms have their leading
    //    `#`/`@` reparsed as inline tag/mention spans (`{<span class="tag">…`).
    const headingAttr = [
      ...html.matchAll(/<h[1-6][^>]*>[^<]*\{(?:[.#]|<span class="(?:tag|mention)")/g),
    ]
    assert.equal(
      headingAttr.length,
      0,
      `${file}: heading rendered a literal attribute block: ${headingAttr.map((m) => m[0]).join(', ')}\n` +
        `Move the attributes onto a {#id .class} line directly ABOVE the heading.`,
    )

    // 2. A paragraph beginning with a block marker (:::, {#, {., |=) is a
    //    block construct that failed to parse and leaked as plain text.
    const paraLeak = [...stripCode(html).matchAll(/<p[^>]*>\s*(:::|\{[#.]|\|=)/g)]
    assert.equal(
      paraLeak.length,
      0,
      `${file}: block markup leaked as paragraph text: ${paraLeak.map((m) => m[0]).join(', ')}`,
    )

    // 3. Fence desync: a classless <pre><code> that swallowed an admonition
    //    fence is the signature of an invalid fence info string upstream
    //    (e.g. ```raw html, which should be ```=html). Real code blocks carry
    //    a language class, so they are not matched here.
    const swallowed = [...html.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)].filter((m) =>
      /(^|\n):::\s/.test(m[1]),
    )
    assert.equal(
      swallowed.length,
      0,
      `${file}: a fenced code block swallowed document sections — likely an invalid ` +
        `fence info string upstream (e.g. use \`\`\`=html, not \`\`\`raw html).`,
    )

    // 4. Golden snapshot: byte-compare against the committed render so any
    //    other drift (intended or regression) surfaces as a reviewable diff.
    const snap = resolve(snapDir, file.replace(/\.crv$/, '.html'))
    if (UPDATE) {
      mkdirSync(snapDir, { recursive: true })
      writeFileSync(snap, html)
      return
    }
    assert.ok(existsSync(snap), `${file}: missing snapshot — run \`npm run examples:snapshot\``)
    assert.equal(
      html,
      readFileSync(snap, 'utf8'),
      `${file}: render drifted from its snapshot — run \`npm run examples:snapshot\` if the change is intended.`,
    )
  })
}
