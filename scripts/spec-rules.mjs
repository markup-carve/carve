#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammarPath = resolve(repo, 'resources/grammar.ebnf')
const registryPath = resolve(repo, 'resources/spec/rules.json')

const clauses = (grammar) => {
  const flat = grammar.replace(/\n\s*/g, ' ')
  const partStarts = [...flat.matchAll(/PART (\d+R?):/g)]
  const matches = [...flat.matchAll(/([A-Z][A-Za-z0-9 ,§`(){}'/+.:[\]-]{3,240}?)\s+--\s+NORMATIVE\s+\[(CARVE-(?:P\d+R?|PRE)-\d{3})\]/g)]
  let partIndex = -1

  return matches.map((match) => {
    while (partStarts[partIndex + 1]?.index < match.index) partIndex += 1
    const partMatch = partStarts[partIndex]
    const part = partMatch?.[1] ?? 'PRE'
    const raw = match[1].trim().replace(/\s+/g, ' ')
    const title = raw.split(/(?<=\.)\)?\s+/).at(-1)
      .replace(/^\d+[a-z]?\.\s*/, '')
      .replace(/^-\s+/, '')
    return {
      id: match[2],
      part,
      title,
    }
  })
}

const command = process.argv[2] ?? '--check'
const actual = clauses(readFileSync(grammarPath, 'utf8'))

if (command === '--check') {
  const stored = JSON.parse(readFileSync(registryPath, 'utf8'))
  const scopes = Array.isArray(stored.scopes) ? stored.scopes : []
  const scopeIds = scopes.map(({ id }) => id)
  if (new Set(scopeIds).size !== scopeIds.length || scopeIds.length !== 5) {
    console.error('resources/spec/rules.json must declare five unique rule scopes')
    process.exitCode = 1
  }
  for (const scope of scopes) {
    if (!scope.id || !scope.title || !scope.description) {
      console.error('every rule scope needs an id, title and description')
      process.exitCode = 1
    }
  }
  for (const rule of stored.rules) {
    if (!scopeIds.includes(rule.scope)) {
      console.error(`${rule.id} has unknown or missing scope '${rule.scope ?? ''}'`)
      process.exitCode = 1
    }
  }
  const byId = (rules) => new Map(rules.map((rule) => [rule.id, rule]))
  const expectedById = byId(stored.rules)
  const actualById = byId(actual)
  const sameRule = (a, b) => a?.part === b?.part && a?.title === b?.title
  if (expectedById.size !== stored.rules.length || actualById.size !== actual.length ||
      stored.rules.length !== actual.length ||
      stored.rules.some((rule) => !sameRule(rule, actualById.get(rule.id))) ||
      actual.some((rule) => !sameRule(rule, expectedById.get(rule.id)))) {
    console.error('resources/spec/rules.json does not cover the current normative clauses')
    process.exitCode = 1
  }
  const retired = stored.retired ?? []
  const allRules = [...stored.rules, ...retired]
  for (const rule of allRules) {
    if (!rule.title || rule.title.length < 4) {
      console.error(`${rule.id} has a truncated or empty title`)
      process.exitCode = 1
    }
  }
  const ids = new Set(allRules.map(({ id }) => id))
  if (ids.size !== allRules.length) {
    console.error('resources/spec/rules.json contains duplicate ids')
    process.exitCode = 1
  }
  for (const { id, part } of allRules) {
    const prefix = part === 'PRE' ? 'PRE' : `P${part}`
    if (!new RegExp(`^CARVE-${prefix}-\\d{3}$`).test(id)) {
      console.error(`${id} does not belong to PART ${part}`)
      process.exitCode = 1
    }
  }
  if (!process.exitCode) console.log(`${stored.rules.length} stable normative rule ids cover the grammar`)
} else {
  console.error(`unknown command: ${command}`)
  process.exitCode = 2
}
