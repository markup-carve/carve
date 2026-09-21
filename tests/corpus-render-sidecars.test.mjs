/*
 * Every non-HTML sidecar in the core corpus is what the pinned build produces.
 *
 * The bytes in a `.md`, `.txt`, `.ansi` or `.fmt` sidecar are HAND-WRITTEN, so
 * `corpus:build` never rewrites one and nothing in this repository rendered
 * them. `corpus-render-fixture-inventory.test.mjs` pins the pairing and locks
 * each sidecar to the case input it was derived from, and says in its own
 * header that it catches nothing by rendering. The only thing that did was
 * `compare:impls`, on the nightly schedule in `.github/workflows/ast-conformance.yml`.
 *
 * So a sidecar could be committed with bytes no engine reproduces and stay
 * green here until the next morning, in a report about engine disagreement.
 *
 * This renders through the pinned `@markup-carve/carve`, the same build
 * `corpus-fmt-roundtrip.test.mjs` uses, because that is what this repository
 * pins. Each engine checks the same sidecars against its own source.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToAnsi, carveToCarve, carveToMarkdown, carveToPlainText } from '@markup-carve/carve'
import { shortfall } from '../scripts/spec/participants.mjs'
import { loadDeclaredFmtDrift } from './fmt-drift.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus')

const RENDERERS = {
  md: carveToMarkdown,
  txt: carveToPlainText,
  ansi: carveToAnsi,
  fmt: carveToCarve,
}

const declared = loadDeclaredFmtDrift(here)

const sidecars = readdirSync(corpusDir)
  .filter((name) => /^\d+-.*\.(md|txt|ansi|fmt)$/.test(name))
  .sort()

test('the sweep reads a corpus, not an empty directory', () => {
  // Every assertion below is made inside a loop over this list, so an unbuilt
  // corpus would report a clean run having compared nothing.
  const thin = shortfall({
    label: 'SIDECARS',
    actual: sidecars.length,
    atLeast: 50,
    of: 'non-HTML sidecar(s) in tests/corpus',
    hint: 'run `npm run corpus:build` first.',
  })
  assert.equal(thin, null, thin ?? '')
  for (const target of Object.keys(RENDERERS)) {
    assert.ok(
      sidecars.some((name) => name.endsWith(`.${target}`)),
      `no .${target} sidecar reached the sweep`,
    )
  }
})

for (const name of sidecars) {
  const target = name.slice(name.lastIndexOf('.') + 1)
  const slug = name.slice(0, name.lastIndexOf('.'))
  // A declared slug is EXCUSED, not ratcheted here. `engine-pin-drift.txt` is
  // kept honest in both directions by `npm run engine:report -- --check` and
  // `engine-fmt-drift.txt` by corpus-fmt-cross-read.test.mjs; a slug listed for
  // a read divergence need not diverge on every target, so asserting that it
  // still mismatches would fail for the wrong reason.
  test(`${target}: ${slug}`, { skip: declared.has(slug) ? 'declared drift' : false }, () => {
    const source = resolve(corpusDir, `${slug}.crv`)
    assert.ok(existsSync(source), `missing ${slug}.crv pair`)
    assert.equal(
      RENDERERS[target](readFileSync(source, 'utf8')),
      readFileSync(resolve(corpusDir, name), 'utf8'),
      `${name} is not what the pinned build renders`,
    )
  })
}
