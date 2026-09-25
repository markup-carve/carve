#!/usr/bin/env node
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Parser } from 'commonmark'

const gap = String.raw`[ \t]*(?:\n[ \t]*)?`
const closingKeyword = String.raw`(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)`
const reference = String.raw`(?:[\w.-]+/[\w.-]+)?#\d+`
const repeatedReference = new RegExp(
  String.raw`\b${closingKeyword}:?[ \t]+${reference}(?:${gap}(?:and\b|,${gap}(?:and\b)?|/)${gap}|[ \t]+)${reference}\b`,
  'gi',
)

function paragraphText(node) {
  let text = ''
  const walker = node.walker()
  for (let event = walker.next(); event; event = walker.next()) {
    if (!event.entering) continue
    if (event.node.type === 'text') text += event.node.literal
    else if (event.node.type === 'softbreak' || event.node.type === 'linebreak') text += '\n'
    else if (event.node.type === 'code' || event.node.type === 'html_inline') text += '\ufffd'
  }
  return text
}

export function findSharedClosingKeywords(body) {
  const matches = []
  const walker = new Parser().parse(body).walker()
  for (let event = walker.next(); event; event = walker.next()) {
    if (!event.entering || !['paragraph', 'heading'].includes(event.node.type)) continue
    matches.push(...[...paragraphText(event.node).matchAll(repeatedReference)].map(([match]) => match))
  }
  return matches
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const matches = findSharedClosingKeywords(process.env.PR_BODY ?? '')
  if (matches.length) {
    for (const match of matches) {
      console.error(`One closing keyword covers multiple issues: ${match}`)
    }
    console.error('Use one keyword per issue, for example: Closes #123, closes #456.')
    process.exitCode = 1
  }
}
