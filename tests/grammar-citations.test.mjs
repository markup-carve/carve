/**
 * A citation into `resources/grammar.ebnf` must survive the file changing.
 *
 * WHY. The grammar is 8k+ lines and moves constantly. Four docs citations were
 * written as `grammar.ebnf:NNN` line numbers, and by the time anyone looked,
 * all four pointed somewhere else - drift of +38, +199, +199 and +837 lines:
 *
 *   grammar.ebnf:246   claimed `blank_line`        -> actually line 445
 *   grammar.ebnf:2262  claimed `whitespace`        -> actually line 3099
 *   grammar.ebnf:700   claimed `definition_indent` -> actually line 901
 *   grammar.ebnf:85-90 claimed the U+FEFF clause   -> actually 123-128
 *
 * Nothing failed while they rotted, because a line number is a claim with no
 * verifier. A production NAME is one the reader can grep and this test can
 * check, so that is the only citation form allowed.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const grammar = readFileSync(resolve(repoRoot, 'resources/grammar.ebnf'), 'utf8')

/*
 * `docs/examples/` is generated from `resources/examples/`, so scanning both
 * would report one authored mistake twice and point the fix at a build output.
 * `docs/superpowers/` is scratch that never ships.
 */
const SKIP = new Set(['node_modules', '.git', '.vitepress', 'superpowers', 'examples'])
const walk = (dir) => readdirSync(dir).flatMap((entry) => {
  if (SKIP.has(entry)) return []
  const full = join(dir, entry)
  if (statSync(full).isDirectory()) return walk(full)
  return full.endsWith('.md') ? [full] : []
})
const files = [
  ...walk(resolve(repoRoot, 'docs')),
  ...readdirSync(resolve(repoRoot, 'resources/examples'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => resolve(repoRoot, 'resources/examples', f)),
]

test('the corpus of scanned pages is not empty', () => {
  /* A broken walk would make every assertion below pass over nothing. */
  assert.ok(files.length > 20, `expected to scan the docs pages, found ${files.length}`)
})

test('no page cites grammar.ebnf by line number', () => {
  const offenders = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(/grammar\.ebnf:(\d+(?:-\d+)?)/g)) {
      offenders.push(`${relative(repoRoot, file)}: grammar.ebnf:${match[1]}`)
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'cite the production name and PART instead - a line number rots silently:\n' + offenders.join('\n'),
  )
})

/*
 * Every production the grammar defines, by name. A citation naming one of these
 * is checkable; a citation naming something else is either a typo or a
 * production that was renamed out from under the prose.
 */
const defined = new Set(
  [...grammar.matchAll(/^([a-z][a-z0-9_]*)\s*(?:\(|=)/gm)].map((match) => match[1]),
)

test('the grammar defines the productions this test reads', () => {
  /* If the production regex ever stops matching, every check below would pass
   * by finding nothing to check. */
  assert.ok(defined.size > 100, `expected the grammar's productions, found ${defined.size}`)
  for (const production of ['blank_line', 'whitespace', 'definition_indent']) {
    assert.ok(defined.has(production), `${production} should be a known production`)
  }
})

test('a production named beside a grammar.ebnf reference exists', () => {
  const offenders = []
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n')
    for (const [index, line] of lines.entries()) {
      if (!line.includes('grammar.ebnf')) continue
      for (const match of line.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)) {
        const name = match[1]
        /* Only names that LOOK like productions are checked; a snake_case word
         * in prose (`json_decode`, `snake_case`) is not a citation. Requiring
         * the grammar.ebnf reference on the same line is what keeps this from
         * flagging ordinary prose. */
        if (defined.has(name)) continue
        offenders.push(`${relative(repoRoot, file)}:${index + 1}: \`${name}\``)
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'these are cited next to grammar.ebnf but the grammar defines no such production:\n' + offenders.join('\n'),
  )
})
