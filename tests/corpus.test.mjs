/*
 * Spec-corpus conformance test.
 *
 * Pairs every tests/corpus/NN-slug.crv with its NN-slug.html, feeds the .crv
 * through the EXECUTABLE SPEC (scripts/spec: the layout automaton plus the
 * PART 9R/PART 10 renderer, driven by resources/carve-core.ohm), and asserts a
 * byte-identical match against the .html (after trimming).
 *
 * The oracle is deliberately the executable spec and NOT an engine build. The
 * corpus states what the spec requires, so the spec repo must be able to prove
 * its own fixtures are self-consistent without waiting for an implementation to
 * ship the rule. Each engine verifies ITSELF against this corpus through its own
 * `spec` / `tests/spec` submodule, which is where an engine-versus-corpus
 * disagreement belongs.
 *
 * Inputs listed in scripts/spec/refused-allow.mjs are deliberately outside the
 * executable subset and are skipped here; the refusal ratchet in
 * `npm run core:check` is what keeps that list honest in both directions.
 *
 * The corpus is generated from docs/examples/{core,extensions,edge-cases}.md by
 * `npm run corpus:build`; CI regenerates it first, so a mismatch here means the
 * examples drifted from the committed corpus or the spec changed.
 *
 * Uses the Node built-in test runner (node:test) so the docs site needs no
 * extra test dependency.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, Refuse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { REFUSED_ALLOW } from '../scripts/spec/refused-allow.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus')

if (!existsSync(corpusDir)) {
  throw new Error(`Spec corpus not found at ${corpusDir}.`)
}

const slugs = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .map((f) => basename(f, '.crv'))
  .sort()

if (slugs.length === 0) {
  throw new Error(
    `No .crv fixtures in ${corpusDir}. Run \`npm run corpus:build\` first.`,
  )
}

for (const slug of slugs) {
  test(slug, { skip: REFUSED_ALLOW.has(slug) ? 'deliberately out of the executable subset' : false }, () => {
    const crv = readFileSync(resolve(corpusDir, `${slug}.crv`), 'utf8')
    const htmlPath = resolve(corpusDir, `${slug}.html`)
    assert.ok(existsSync(htmlPath), `missing ${slug}.html pair`)
    const expected = readFileSync(htmlPath, 'utf8')
    let got
    try {
      got = renderDoc(parse(crv))
    } catch (e) {
      if (e instanceof Refuse || e.refuse) {
        assert.fail(
          `the executable spec refused this input: ${e.message}\n` +
            `Cover it in scripts/spec, or add "${slug}" to scripts/spec/refused-allow.mjs deliberately.`,
        )
      }
      throw e
    }
    assert.equal(got.trim(), expected.trim())
  })
}
