#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, Refuse } from './spec/layout.mjs'
import { renderDoc } from './spec/html.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

for (const name of ['core', 'extensions', 'edge-cases']) {
  const path = resolve(root, 'resources/examples', `${name}.md`)
  const lines = readFileSync(path, 'utf8').split('\n')
  let inCompare = false
  let compareFence = ''
  let carve = null
  let language = null
  let fence = ''
  let start = -1
  const replacements = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!inCompare) {
      const open = line.trim().match(/^(:{3,})\s+compare(?:\s|$)/)
      if (open) {
        inCompare = true
        compareFence = open[1]
      }
      continue
    }
    if (language === null && line.trim() === compareFence) {
      inCompare = false
      carve = null
      continue
    }
    if (language === null) {
      const open = line.match(/^(`{3,})(carve|html)\s*$/)
      if (open) {
        fence = open[1]
        language = open[2]
        start = i + 1
      }
      continue
    }
    if (!line.startsWith(fence) || line.slice(fence.length).trim() !== '') continue

    const body = lines.slice(start, i).join('\n')
    if (language === 'carve') {
      carve = body
    } else if (carve !== null) {
      try {
        replacements.push({ start, end: i, lines: renderDoc(parse(carve)).trim().split('\n') })
      } catch (error) {
        if (!(error instanceof Refuse) && !error?.refuse) throw error
      }
      carve = null
    }
    language = null
    fence = ''
    start = -1
  }

  for (const replacement of replacements.reverse()) {
    lines.splice(replacement.start, replacement.end - replacement.start, ...replacement.lines)
  }
  writeFileSync(path, lines.join('\n'))
}
