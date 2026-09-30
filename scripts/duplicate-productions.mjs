#!/usr/bin/env node

/*
 * Two productions may spell the same right-hand side only if the ledger says
 * why.
 *
 * A shared rule that is COPIED instead of referenced drifts: widening one copy
 * leaves the others behind, and nothing reports it. Seven productions spelled
 * the inline-span content alternation before carve#2671. Where the names
 * denote one rule, the aliases now reference it
 * (`emphasis_content = inline_span_content`), which is a shape this check
 * cannot complain about.
 *
 * What is left is the other case: names that read alike today by coincidence
 * and could legitimately move apart - three kinds of indent, three attribute
 * slots. Collapsing those would encode the coincidence as a rule, so they are
 * declared in resources/duplicate-productions.txt instead.
 *
 * Fails in both directions, like the reachability ledger beside it: an
 * undeclared duplicate group, and a declared group that is no longer duplicated.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/*
 * A single-symbol body IS the alias shape this check wants people to use, so
 * two productions that both reference one rule are never a finding.
 */
const ALIAS = /^[A-Za-z_][\w-]*$/

const grammar = readFileSync(resolve(repo, 'resources/grammar.ebnf'), 'utf8')
const ledgerText = readFileSync(resolve(repo, 'resources/duplicate-productions.txt'), 'utf8')

const withoutComments = grammar.replace(/\(\*[\s\S]*?\*\)/g, ' ')

const bodyOf = (text, from) => {
  let quote = null
  for (let i = from; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"') {
      quote = ch
      continue
    }
    if (ch === ';') return text.slice(from, i)
  }
  return null
}

const productions = new Map()
const declaration = /^[ \t]*([A-Za-z_][\w-]*)[ \t]*(?:::=|=)[ \t]*/gm
for (let m = declaration.exec(withoutComments); m; m = declaration.exec(withoutComments)) {
  const body = bodyOf(withoutComments, m.index + m[0].length)
  if (body === null) continue
  productions.set(m[1], body.split(/\s+/).join(' ').trim())
}

const groups = new Map()
for (const [name, body] of productions) {
  if (body === '' || ALIAS.test(body)) continue
  if (!groups.has(body)) groups.set(body, [])
  groups.get(body).push(name)
}

const duplicated = [...groups.entries()]
  .filter(([, names]) => names.length > 1)
  .map(([body, names]) => ({ key: names.slice().sort().join(' '), body, names }))

const declared = new Map()
for (const line of ledgerText.split('\n')) {
  if (line.trim() === '' || line.startsWith('#')) continue
  const [names, ...rest] = line.split('\t')
  const reason = rest.join('\t').trim()
  const key = names.trim().split(/\s+/).sort().join(' ')
  if (reason === '') {
    console.error(`resources/duplicate-productions.txt: ${key} has no reason`)
    process.exitCode = 1
    continue
  }
  declared.set(key, reason)
}

const undeclared = duplicated.filter((group) => !declared.has(group.key))
const found = new Set(duplicated.map((group) => group.key))
const stale = [...declared.keys()].filter((key) => !found.has(key)).sort()

if (undeclared.length > 0) {
  console.error(
    `${undeclared.length} group(s) of productions spell the same right-hand side and are not declared:\n` +
      undeclared.map((g) => `  ${g.names.sort().join(', ')}\n    ::= ${g.body}`).join('\n') +
      '\nEither give them one rule and make the others reference it, or add the group to ' +
      'resources/duplicate-productions.txt with the reason they must stay apart.',
  )
  process.exitCode = 1
}

if (stale.length > 0) {
  console.error(
    `${stale.length} declaration(s) in resources/duplicate-productions.txt no longer name a duplicate group:\n` +
      stale.map((key) => `  ${key}`).join('\n') +
      '\nRemove the line; a stale exemption is what would hide the next copied rule.',
  )
  process.exitCode = 1
}

if (!process.exitCode) {
  console.log(
    `${productions.size} productions, ${duplicated.length} declared duplicate group(s)`,
  )
}
