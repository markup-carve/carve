/*
 * PART 9 §25 names the URL schemes a renderer must blank, and three of them are
 * pinned by a corpus document.
 *
 * The clause lists four core schemes plus nineteen OS protocol-handler and
 * command-execution schemes (the CVE-2026-20841 class). The corpus reaches
 * `ms-msdt`, `ms-office` and `shell`; the other sixteen - `ms-word`, `ms-excel`,
 * `search-ms`, `vscode`, `jar` and the rest - appear in no document at all. The
 * reference engine blanks all of them today, and nothing would notice if it
 * stopped.
 *
 * That is the exact failure the clause was written for. Its own history:
 * "Measured before this was written down: all three engines blanked `ms-msdt:`
 * in HTML and emitted it verbatim in Markdown, because each had mirrored the
 * four-scheme core of the denylist into that target and not the OS-handler
 * class" (carve#352). A list that is normative in one file and exercised for
 * three of twenty-three entries is that shape waiting to happen again.
 *
 * So the list is read FROM THE CLAUSE rather than copied here: when §25 gains a
 * scheme, this test covers it without anyone remembering to add it, which is the
 * only version of this check worth having.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml } from '@markup-carve/carve'
import { shortfall } from '../scripts/spec/participants.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

/** The clause's own paragraph, so a scheme named elsewhere cannot drift in. */
function clauseText() {
  const start = grammar.indexOf('renderer MUST reject any URL whose scheme is')
  assert.notEqual(start, -1, '§25 no longer contains its denylist sentence')
  const end = grammar.indexOf('Scheme detection MUST first strip', start)
  assert.notEqual(end, -1, '§25 no longer contains its scheme-detection sentence')

  return grammar.slice(start, end)
}

/** Schemes the clause DENIES: the four core ones plus the OS-handler class. */
function deniedSchemes() {
  const text = clauseText()
  const upTo = text.indexOf('Ordinary web and contact schemes')

  return [...new Set([...text.slice(0, upTo).matchAll(/`([a-z][a-z0-9-]*)`/g)].map((m) => m[1]))]
}

/** Schemes the clause explicitly keeps ALLOWED. */
function allowedSchemes() {
  const text = clauseText()
  const from = text.indexOf('Ordinary web and contact schemes')

  return [...new Set([...text.slice(from).matchAll(/`([a-z][a-z0-9-]*)`/g)].map((m) => m[1]))]
}

const hrefOf = (url) => /href="([^"]*)"/.exec(carveToHtml(`[x](${url})\n`))?.[1]
const srcOf = (url) => /src="([^"]*)"/.exec(carveToHtml(`![i](${url})\n`))?.[1]

test('the clause still parses into two lists', () => {
  // Both counts, because a regex that stops matching would otherwise turn every
  // assertion below into a statement about an empty list - and the denied list
  // is the one that matters, so it gets the larger floor.
  const problems = [
    shortfall({ label: '§25 denied', actual: deniedSchemes().length, atLeast: 20, of: 'scheme(s)' }),
    shortfall({ label: '§25 allowed', actual: allowedSchemes().length, atLeast: 5, of: 'scheme(s)' }),
  ].filter(Boolean)
  assert.deepEqual(problems, [], problems.join('\n'))
})

test('every scheme the clause denies is blanked, in href and src', () => {
  const leaked = []
  for (const scheme of deniedSchemes()) {
    if (hrefOf(`${scheme}:payload`) !== '') leaked.push(`${scheme} (href)`)
    if (srcOf(`${scheme}:payload`) !== '') leaked.push(`${scheme} (src)`)
  }
  assert.deepEqual(
    leaked,
    [],
    `§25 denies these and the reference engine emits them: ${leaked.join(', ')}. ` +
      'The corpus pins three of the clause\'s schemes, so this is the only check that ' +
      'covers the rest.',
  )
})

test('every scheme the clause allows passes through', () => {
  // The other direction: a denylist that quietly became an allowlist would block
  // `tel:` and `ftp:` and no corpus document would notice either.
  const blocked = []
  for (const scheme of allowedSchemes()) {
    const url = `${scheme}://example.com`
    if (hrefOf(url) !== url) blocked.push(`${scheme} -> ${JSON.stringify(hrefOf(url))}`)
  }
  assert.deepEqual(blocked, [], `§25 keeps these allowed and the engine blocked them: ${blocked.join(', ')}`)
})

test('an attribute override cannot reintroduce a denied scheme', () => {
  // Also §25, and pinned nowhere else for the OS class: the structural URL wins.
  const html = carveToHtml('[x](/safe){href=ms-msdt:payload}\n')
  assert.ok(!html.includes('ms-msdt'), `attribute override survived: ${html}`)
})
