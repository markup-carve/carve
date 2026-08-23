/*
 * The authored Carve documents this repository holds, and their population.
 *
 * These are the ```carve samples written inline in the docs pages plus the
 * free-form `.crv` files the Playground imports. What they have in common is
 * the property that makes them worth comparing: NO expected-output file pins
 * them. The corpus is the opposite - every one of its documents carries a
 * committed `.html`, and `tests/corpus.test.mjs` holds the executable spec to
 * it - so on the corpus an oracle-against-engine comparison cannot fail while
 * the corpus test is green. Measured, not argued: the oracle reproduces all
 * 1362 corpus fixtures byte for byte, so its answer there is already pinned to
 * the same file the engines are scored against.
 *
 * That is the scoping carve#1552 asked for. The oracle is the only reader in
 * the project derived straight from the normative text, which makes its
 * disagreement evidence rather than a tie to break - but evidence is only
 * available where something is not already pinned, and here that is the
 * documents a human wrote for other humans to read.
 *
 * The extractor lives here rather than in a test because two runners need it:
 * `tests/doc-carve-samples.test.mjs` (does the sample parse and build its
 * blocks) and `tests/the-oracle-reads-the-authored-documents.test.mjs` (does
 * the engine read it the way the clause does). A second copy of a scanning rule
 * is what `scripts/lib/corpus-targets.mjs` exists to prevent.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))

/** Free-form Carve the Playground and the dogfood preview import. */
const PLAYGROUND_DIR = 'docs/.vitepress/examples'

/**
 * The docs pages whose samples are AUTHORED.
 *
 * `docs/examples/` is generated from the corpus, so its samples are corpus
 * documents wearing a page: including them would re-compare what the corpus
 * already pins and would move this population every time the corpus grows.
 */
export function authoredPages() {
  return execFileSync('git', ['ls-files', 'docs'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((path) => path.endsWith('.md') && !path.startsWith('docs/examples/'))
}

/*
 * Only fences opened exactly ```carve are samples. A widened fence (````carve)
 * is usually a sample ABOUT fences, whose body is deliberately not a document
 * on its own.
 */
export function samplesIn(text) {
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

/**
 * Every authored document, in a stable order.
 *
 * A sample is given the trailing newline a file would have: a document read
 * from disk ends in one, and the block scanner above drops it, so without this
 * the population would differ from the same text saved as a `.crv` for a reason
 * no reader intends.
 *
 * @returns {Array<{id: string, source: string}>}
 */
export function authoredDocuments() {
  const docs = []
  for (const page of authoredPages()) {
    const text = readFileSync(join(root, page), 'utf8')
    for (const [index, sample] of samplesIn(text).entries()) {
      docs.push({ id: `${page}#${index + 1}`, source: sample.endsWith('\n') ? sample : `${sample}\n` })
    }
  }
  for (const file of readdirSync(join(root, PLAYGROUND_DIR)).filter((f) => f.endsWith('.crv')).sort()) {
    docs.push({
      id: `${PLAYGROUND_DIR}/${file}`,
      source: readFileSync(join(root, PLAYGROUND_DIR, file), 'utf8'),
    })
  }

  return docs
}

/*
 * THE POPULATION, PINNED.
 *
 * Measured on 2026-08-23 over the tree these numbers were written in: 85
 * authored documents, 84 of which the executable spec answers for. The one it
 * does not is a citation definition, which is Tier-2 and outside the subset
 * `scripts/spec` models at all.
 *
 * Pinned EXACTLY and in both directions, which is the whole point of writing
 * them down. A floor would let the population shrink - a docs rewrite that
 * dropped twenty samples would read as a pass - and a ceiling alone would let a
 * new sample join without anyone noticing it was never compared. carve#1541 is
 * the local precedent for why this matters: a reconciliation counted test
 * REGISTRATIONS rather than comparisons, so it held before a single comparison
 * had run.
 *
 * Both numbers move by hand, in the commit that changes the docs. The failure
 * message says which way it moved and what to do, because a red gate whose fix
 * is "look up how this file works" is a red gate that gets deleted.
 */
export const AUTHORED_POPULATION = 85
export const AUTHORED_ANSWERED = 84
