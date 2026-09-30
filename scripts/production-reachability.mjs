#!/usr/bin/env node

/*
 * Every production in grammar.ebnf is reachable from `document`, or it is
 * declared in resources/unreachable-productions.txt with the reason.
 *
 * The check fails in both directions. A production that falls off the root is
 * a rule that derives nothing - an edit to it changes no document, silently -
 * and a declaration that has since become reachable is a stale exemption that
 * would hide the next one. grammar:reach does not cover this: it compares the
 * Ohm Core grammar against the corpus and never asks what the EBNF derives.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = 'document'

const grammar = readFileSync(resolve(repo, 'resources/grammar.ebnf'), 'utf8')
const ledgerText = readFileSync(resolve(repo, 'resources/unreachable-productions.txt'), 'utf8')

const withoutComments = grammar.replace(/\(\*[\s\S]*?\*\)/g, ' ')

const productions = new Map()
for (const chunk of withoutComments.split(/\n(?=\s*[A-Za-z_][\w-]*\s*(?:::=|=)\s)/)) {
  const match = /^\s*([A-Za-z_][\w-]*)\s*(?:::=|=)\s*([\s\S]*)$/.exec(chunk)
  if (match) productions.set(match[1], match[2])
}

const reachable = new Set()
const pending = [ROOT]
while (pending.length > 0) {
  const name = pending.pop()
  if (reachable.has(name) || !productions.has(name)) continue
  reachable.add(name)
  for (const word of productions.get(name).match(/[A-Za-z_][\w-]*/g) ?? []) {
    if (productions.has(word) && !reachable.has(word)) pending.push(word)
  }
}

const declared = new Map()
for (const line of ledgerText.split('\n')) {
  if (line.trim() === '' || line.startsWith('#')) continue
  const [name, ...rest] = line.split('\t')
  const reason = rest.join('\t').trim()
  if (reason === '') {
    console.error('resources/unreachable-productions.txt: ' + name + ' has no reason')
    process.exitCode = 1
    continue
  }
  declared.set(name.trim(), reason)
}

const unreachable = [...productions.keys()].filter((name) => !reachable.has(name)).sort()
const undeclared = unreachable.filter((name) => !declared.has(name))
const stale = [...declared.keys()].filter((name) => reachable.has(name)).sort()
const unknown = [...declared.keys()].filter((name) => !productions.has(name)).sort()

const list = (names) => names.map((name) => '  ' + name).join('\n')

if (undeclared.length > 0) {
  console.error(
    undeclared.length + ' production(s) cannot be reached from ' + ROOT + ' and are not declared:\n' +
      list(undeclared) +
      '\nEither give the rule a reference, or add it to resources/unreachable-productions.txt with the reason.',
  )
  process.exitCode = 1
}

if (stale.length > 0) {
  console.error(
    stale.length + ' declaration(s) in resources/unreachable-productions.txt are reachable now:\n' +
      list(stale) +
      '\nRemove the line; the exemption is what would hide the next unreachable rule.',
  )
  process.exitCode = 1
}

if (unknown.length > 0) {
  console.error(unknown.length + ' declaration(s) name no production:\n' + list(unknown))
  process.exitCode = 1
}

if (!process.exitCode) {
  console.log(
    reachable.size + ' of ' + productions.size + ' productions reach ' + ROOT +
      '; ' + unreachable.length + ' declared unreachable',
  )
}
