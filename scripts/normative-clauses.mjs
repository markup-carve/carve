#!/usr/bin/env node
/*
 * Regenerate resources/normative-clauses.txt from resources/grammar.ebnf.
 *
 * The inventory is the guard described in that file's header: a clause may be
 * removed, but not silently. Run this after ADDING a clause; after removing
 * one, delete its line by hand so the removal shows up in the diff next to the
 * grammar change that caused it.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammarPath = resolve(repo, 'resources/grammar.ebnf')
const inventoryPath = resolve(repo, 'resources/normative-clauses.txt')

export function extractNormativeClauses(grammar) {
  // Clause headings wrap across lines, so flatten the indentation first and
  // match against the running text rather than line by line.
  const flat = grammar.replace(/\n\s*/g, ' ')
  const raw = [...flat.matchAll(/([A-Z][A-Za-z0-9 ,§`(){}'/+.:[\]-]{3,110}?)\s+--\s+NORMATIVE/g)]
  const headings = raw
    .map((m) => m[1].trim().replace(/\s+/g, ' '))
    // A match can start mid-sentence when the preceding prose ends in a capital
    // run; keep only the last sentence, which is the heading itself.
    .map((s) => {
      const parts = s.split(/(?<=\.)\s+/)
      return parts[parts.length - 1].trim()
    })
    // Drop the section number and any list bullet the heading is written under.
    .map((s) => s.replace(/^\d+[a-z]?\.\s*/, '').replace(/^-\s+/, ''))
  // A heading is not unique: `ATTRIBUTES -- NORMATIVE` heads two clauses. Count
  // rather than dedupe, or deleting one of a repeated pair leaves the guard
  // green because its twin still answers for it.
  const counts = new Map()
  for (const h of headings) counts.set(h, (counts.get(h) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function formatInventory(entries) {
  return entries.map(([clause, count]) => `${count}  ${clause}`)
}

export function readInventory(text) {
  return text
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const m = /^(\d+)\s\s+(.*)$/.exec(l.trim())
      if (!m) throw new Error(`malformed inventory line: ${l}`)
      return [m[2], Number(m[1])]
    })
}

// Compare DECODED paths. `import.meta.url` percent-encodes a space (and every
// other URL-reserved character), `process.argv[1]` does not, so the template
// form below compared unequal under any checkout path containing one - and the
// script then exited having regenerated nothing, silently, which is the worst
// way for a guard's own generator to fail.
if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  const grammar = readFileSync(grammarPath, 'utf8')
  const clauses = extractNormativeClauses(grammar)
  const existing = readFileSync(inventoryPath, 'utf8')
  const header = existing.slice(0, existing.indexOf('\n#\n# To regenerate'))
  const tail = '\n#\n# To regenerate after adding a clause: node scripts/normative-clauses.mjs\n'
  writeFileSync(inventoryPath, header + tail + formatInventory(clauses).join('\n') + '\n')
  const total = clauses.reduce((n, [, count]) => n + count, 0)
  console.log(`resources/normative-clauses.txt: ${total} clauses, ${clauses.length} distinct headings`)
}
