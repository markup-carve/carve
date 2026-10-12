#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scanReferences = (files, rules) => {
  const active = new Set(rules.rules.map(({ id }) => id))
  const sections = new Map()
  let part = 'PRE'
  const sources = [...files].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .map(({ name, text }) => {
      const lines = text.split('\n')
      const header = lines.slice(0, 3).map((line) => line.match(/^\s*PART (\d+R?):/)).find(Boolean)
      if (header) part = header[1]
      if (['7', '9', '10', '11', '12'].includes(part)) {
        if (!sections.has(part)) sections.set(part, new Set())
        for (const line of lines) {
          const heading = line.match(/^ {1,8}(\d+[a-z]?)\. +[A-Z`(\[]/)
          if (heading) sections.get(part).add(heading[1])
        }
      }
      const lineNumbers = []
      let flat = ''
      let line = 1
      for (let i = 0; i < text.length; i += 1) {
        lineNumbers.push(line)
        if (text[i] === '\n') {
          flat += ' '
          line += 1
          while (/\s/.test(text[i + 1] ?? '') && i + 1 < text.length) {
            i += 1
            if (text[i] === '\n') line += 1
          }
        } else flat += text[i]
      }
      return { name, part, flat, lines, lineNumbers }
    })
  const violations = []
  let clauseIds = 0
  let sectionReferences = 0
  for (const { name, part, flat, lines, lineNumbers } of sources) {
    const report = (index, message) => violations.push({ file: name, line: lineNumbers[index], message })
    for (const match of flat.matchAll(/CARVE-(?:P\d+R?|PRE)-\d{3}/g)) {
      if (/NORMATIVE\s*\[$/.test(flat.slice(Math.max(0, match.index - 20), match.index))) continue
      clauseIds += 1
      if (!active.has(match[0])) report(match.index, `clause id ${match[0]} is not an active rule in rules.json`)
    }
    for (const match of flat.matchAll(/\bSS(\d+[a-z]?)\b/g)) report(match.index, `SS${match[1]} spells the section sign as SS; write §${match[1]}`)
    const covered = new Set()
    const external = (index) => /\S+\.(?:md|json|ebnf|mjs)\s*$/.test(flat.slice(Math.max(0, index - 80), index))
    // A clause title is kept as written, so a § inside one is not a citation to rewrite.
    const inTitle = (index) => {
      const line = lines[lineNumbers[index] - 1]
      if (!/^ {1,8}\d+[a-z]?\. +[A-Z`(\[]/.test(line)) return false
      const marker = line.trimStart().indexOf('-- NORMATIVE')
      return marker >= 0 && index - lineNumbers.indexOf(lineNumbers[index]) < marker
    }
    const checkSection = (target, id, index) => {
      sectionReferences += 1
      if (!sections.get(target)?.has(id)) {
        report(index, `PART ${target} §${id} names no section heading in PART ${target}`)
      }
    }
    for (const match of flat.matchAll(/PART\s+(\d+R?)\s*,?\s*(§{1,2})\s*(\d+[a-z]?)/g)) {
      const sign = match.index + match[0].indexOf('§')
      if (external(sign)) continue
      const target = match[1]
      checkSection(target, match[3], match.index)
      let end = match.index + match[0].length
      const chain = match[2] === '§§'
        ? /^(?:\s*,\s*(?:and\s+|or\s+)?|\s+(?:and|or)\s+)(?:§\s*)?(\d+[a-z]?)/
        : /^(?:\s*,\s*|\s+(?:and|or|to|through)\s+|\s*\/\s*)§\s*(\d+[a-z]?)/
      let member
      while ((member = flat.slice(end).match(chain))) {
        const offset = member[0].indexOf('§')
        if (offset >= 0 && external(end + offset)) break
        checkSection(target, member[1], end + member[0].search(/§|\d/))
        end += member[0].length
      }
      for (let i = sign; i < end; i += 1) {
        if (flat[i] === '§') covered.add(i)
      }
    }
    if (part === '12') {
      for (const match of flat.matchAll(/§{1,2}\s*(\d+[a-z]?)/g)) {
        if (!covered.has(match.index) && !external(match.index) && !inTitle(match.index)) {
          report(match.index, `bare §${match[1]} in PART 12; write a clause id or PART <n> §${match[1]}`)
        }
      }
    }
  }
  return { violations, clauseIds, sectionReferences }
}

export const checkReferences = (files, rules) => scanReferences(files, rules).violations

const selfTest = () => {
  const rules = { rules: [{ id: 'CARVE-P12-001' }], retired: [] }
  const part9 = { name: '09.ebnf', text: 'PART 9:\n  1. ONE\n  2. TWO\n' }
  const part12 = { name: '12.ebnf', text: 'PART 12:\nPART 9 §1 and §2\nsyntax.md §4.1\n   1. FROM §1 -- NORMATIVE [CARVE-P12-001]. Body.\n' }
  const cases = [
    ['clause id', [{ name: '00.ebnf', text: 'Cites CARVE-P9-999' }], 'clause id CARVE-P9-999 is not an active rule in rules.json'],
    ['section reference', [{ ...part9, text: `${part9.text}PART 9 §${99}\n§1` }], `PART 9 §${99} names no section heading in PART 9`],
    ['bare reference', [part9, { ...part12, text: `${part12.text}§3` }], 'bare §3 in PART 12; write a clause id or PART <n> §3'],
    ['mangled section sign', [{ ...part9, text: `${part9.text}see SS2` }], 'SS2 spells the section sign as SS; write §2'],
  ]
  for (const [which, files, message] of cases) {
    const violations = checkReferences(files, rules)
    if (violations.length !== 1 || violations[0].message !== message) {
      console.error(`self-test: ${which} did not fire`)
      process.exitCode = 1
      return false
    }
  }
  return true
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (selfTest()) {
    const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const sourceDir = resolve(repo, 'resources/spec')
    const files = readdirSync(sourceDir).filter((name) => name.endsWith('.ebnf')).sort()
      .map((name) => ({ name: `resources/spec/${name}`, text: readFileSync(resolve(sourceDir, name), 'utf8') }))
    const rules = JSON.parse(readFileSync(resolve(sourceDir, 'rules.json'), 'utf8'))
    const { violations, clauseIds, sectionReferences } = scanReferences(files, rules)
    for (const { file, line, message } of violations) console.error(`${file}:${line}: ${message}`)
    if (violations.length) process.exitCode = 1
    else console.log(`${clauseIds} clause ids and ${sectionReferences} section references in the spec sources resolve`)
  }
}
