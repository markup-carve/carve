// Snapshots the depth of every 0.1 docs page into tests/fixtures/docs-depth-0.1.json,
// so tests/docs-depth.test.mjs can compare HEAD against it without fetching origin/0.1.
// Usage: node scripts/docs-depth-baseline.mjs [ref]   (default ref: origin/0.1)
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const baselinePath = resolve(repo, 'tests/fixtures/docs-depth-0.1.json')

export function isDepthPage(path) {
  return (
    path.startsWith('docs/') &&
    path.endsWith('.md') &&
    !path.startsWith('docs/superpowers/') &&
    !path.startsWith('docs/blog/') &&
    !path.endsWith('README.md')
  )
}

// Any indent: fences inside list items sit deeper than three spaces.
const fenceOpen = /^\s*(`{3,}|~{3,})\s*([^\s`{]*)/

// Splits a page into lines tagged with whether they sit inside a code fence.
export function scanLines(text) {
  const out = []
  let fence = null
  for (const [index, line] of text.split('\n').entries()) {
    if (fence) {
      const close = line.match(/^\s*(`{3,}|~{3,})\s*$/)
      const isClose = close && close[1][0] === fence[0] && close[1].length >= fence.length
      out.push({ line, number: index + 1, fenced: true, fenceLine: isClose })
      if (isClose) fence = null
      continue
    }
    const open = line.match(fenceOpen)
    // A backtick fence's info string cannot contain a backtick (CommonMark); that line is a code span.
    if (open && !(open[1][0] === '`' && line.slice(line.indexOf(open[1]) + open[1].length).includes('`'))) {
      fence = open[1]
      out.push({ line, number: index + 1, fenced: true, fenceLine: true, info: open[2].toLowerCase() })
      continue
    }
    out.push({ line, number: index + 1, fenced: false, fenceLine: false })
  }
  return out
}

export function measure(text) {
  const lines = scanLines(text)
  let headings = 0
  let compare = 0
  let carveFences = 0
  for (const l of lines) {
    if (l.info === 'carve' || l.info === 'crv') carveFences++
    if (l.fenced) continue
    if (/^#{2,3}\s/.test(l.line)) headings++
    if (/^:{3,}\s*compare\b/.test(l.line)) compare++
  }
  const images = (text.match(/!\[|<img\b|\.svg\)/g) ?? []).length
  return { bytes: Buffer.byteLength(text, 'utf8'), headings, compare, carveFences, images }
}

function git(args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ref = process.argv[2] ?? 'origin/0.1'
  const commit = git(['rev-parse', ref]).trim()
  const pages = {}
  for (const path of git(['ls-tree', '-r', '--name-only', commit, 'docs']).split('\n').filter(isDepthPage).sort()) {
    pages[path] = measure(git(['show', `${commit}:${path}`]))
  }
  writeFileSync(baselinePath, `${JSON.stringify({ ref, commit, pages }, null, 2)}\n`)
  console.log(`wrote ${Object.keys(pages).length} pages from ${ref} (${commit.slice(0, 12)})`)
}
