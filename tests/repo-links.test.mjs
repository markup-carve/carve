/**
 * A link into this repo's own source must point at something that exists.
 *
 * WHY. The docs cite their own source constantly - the grammar, the corpus,
 * the example files, the schemas - as absolute GitHub URLs. Those are the
 * citations most likely to rot, because a rename or a move updates the file
 * and nothing updates the sentence pointing at it. This session moved the
 * example sources out of `docs/` and every one of those links had to be
 * rewritten by hand; nothing would have caught a missed one.
 *
 * It is the same failure as the `grammar.ebnf:NNN` line citations: a claim
 * about the repository with no verifier. This test is the verifier for the
 * half that can be checked without a network.
 *
 * Genuinely external links (djot.net, example.com, and the rest) are NOT
 * checked here - that needs a network and would make the suite flaky. Use
 * `npm run links:check` for those.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

/*
 * Only TRACKED Markdown is scanned. Everything under docs/examples/ is
 * generated, and its fixture links are derived from real fixture names by the
 * generator - scanning them would make this test depend on build order while
 * checking something the generator already guarantees.
 */
const files = execFileSync('git', ['ls-files', 'docs', 'resources', '*.md'], {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .split('\n')
  .filter((path) => path.endsWith('.md') && !path.startsWith('docs/examples/'))

test('the scanned file list is not empty', () => {
  /* A failed git call would make the assertion below pass over nothing. */
  assert.ok(files.length > 20, `expected tracked Markdown, found ${files.length}`)
})

const SELF_LINK = /https:\/\/github\.com\/markup-carve\/carve\/(?:blob|tree)\/main\/([^)\s"'<>]+)/g

test('every link into this repo resolves to a real path', () => {
  const broken = []
  let checked = 0
  for (const file of files) {
    const text = readFileSync(resolve(repoRoot, file), 'utf8')
    for (const match of text.matchAll(SELF_LINK)) {
      /* Strip a line/anchor fragment: the path is what exists on disk. */
      const target = match[1].replace(/#.*$/, '').replace(/[.,;:]$/, '')
      checked++
      if (!existsSync(resolve(repoRoot, target))) broken.push(`${file}: ${target}`)
    }
  }
  /* Authored Markdown carries a modest number of these; the ~1,000 fixture
   * links on the generated pages are built from real fixture names by the
   * generator and are not scanned here. The floor only catches a scan that
   * silently matched nothing. */
  assert.ok(checked >= 10, `expected to check the self-links, checked ${checked}`)
  assert.deepEqual(
    broken,
    [],
    'these links point at paths that do not exist in the repo:\n' + [...new Set(broken)].join('\n'),
  )
})
