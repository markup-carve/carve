// Writes or checks spec/0.2/data/unicode-categories.json from the UnicodeData.txt of the pinned
// Unicode version (C2-I-127).
//   node scripts/spec2-unicode.mjs --write [--ucd <path to UnicodeData.txt>]
//   node scripts/spec2-unicode.mjs --check [--ucd <path to UnicodeData.txt>]
// Without --ucd the file is fetched from unicode.org. The check fails when the fetched file has
// another SHA-256 than the data file records, or when the regenerated file differs from the one
// in the repository.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSION = '18.0.0'
const SOURCE = `https://www.unicode.org/Public/${VERSION}/ucd/UnicodeData.txt`
// Category group -> the general category values it joins, and the clauses that read it.
const GROUPS = [
  { name: 'Cf', values: ['Cf'], clauses: ['C2-I-122', 'C2-I-127'] },
  { name: 'L', values: ['Lu', 'Ll', 'Lt', 'Lm', 'Lo'], clauses: ['C2-I-047', 'C2-I-048', 'C2-I-090', 'C2-I-092', 'C2-I-099', 'C2-I-127'] },
  { name: 'M', values: ['Mn', 'Mc', 'Me'], clauses: ['C2-I-050', 'C2-I-092', 'C2-I-127'] },
  { name: 'N', values: ['Nd', 'Nl', 'No'], clauses: ['C2-I-047', 'C2-I-048', 'C2-I-090', 'C2-I-092', 'C2-I-099', 'C2-I-127', 'C2-H-148'] },
]

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'spec/0.2/data/unicode-categories.json')
const args = process.argv.slice(2)
const mode = args.includes('--write') ? 'write' : args.includes('--check') ? 'check' : null
if (mode === null) {
  console.error('usage: spec2-unicode.mjs --write|--check [--ucd <UnicodeData.txt>]')
  process.exit(2)
}
const ucdAt = args.indexOf('--ucd')

async function source() {
  if (ucdAt !== -1) return readFileSync(args[ucdAt + 1])
  const response = await fetch(SOURCE)
  if (!response.ok) throw new Error(`${SOURCE}: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

const hex = cp => cp.toString(16).toUpperCase().padStart(4, '0')

function generate(bytes) {
  const byCategory = new Map()
  let first = null
  for (const line of bytes.toString('utf8').split('\n')) {
    if (line === '') continue
    const [code, name, category] = line.split(';')
    const cp = Number.parseInt(code, 16)
    // A range is written as two lines, `<..., First>` and `<..., Last>`.
    if (name.endsWith(', First>')) { first = cp; continue }
    const from = name.endsWith(', Last>') ? first : cp
    first = null
    if (!byCategory.has(category)) byCategory.set(category, [])
    byCategory.get(category).push([from, cp])
  }
  const categories = GROUPS.map(group => {
    const spans = group.values.flatMap(value => byCategory.get(value) ?? []).sort((a, b) => a[0] - b[0])
    const merged = []
    for (const [from, to] of spans) {
      const last = merged.at(-1)
      if (last !== undefined && from === last[1] + 1) last[1] = to
      else merged.push([from, to])
    }
    const ranges = merged.map(([from, to]) => (from === to ? hex(from) : `${hex(from)}-${hex(to)}`))
    return { name: group.name, values: group.values, ranges, clauses: group.clauses }
  })
  const value = {
    $schema: 'schemas/unicode-categories.schema.json',
    unicode: VERSION,
    source: SOURCE,
    source_sha256: createHash('sha256').update(bytes).digest('hex'),
    categories,
  }
  // One range per line keeps diffs between versions readable.
  const lines = ['{']
  lines.push(`  "$schema": ${JSON.stringify(value.$schema)},`)
  lines.push(`  "unicode": ${JSON.stringify(value.unicode)},`)
  lines.push(`  "source": ${JSON.stringify(value.source)},`)
  lines.push(`  "source_sha256": ${JSON.stringify(value.source_sha256)},`)
  lines.push('  "categories": [')
  categories.forEach((row, index) => {
    lines.push('    {')
    lines.push(`      "name": ${JSON.stringify(row.name)},`)
    lines.push(`      "values": ${JSON.stringify(row.values).replaceAll(',', ', ')},`)
    lines.push('      "ranges": [')
    row.ranges.forEach((range, at) => lines.push(`        ${JSON.stringify(range)}${at + 1 < row.ranges.length ? ',' : ''}`))
    lines.push('      ],')
    lines.push(`      "clauses": ${JSON.stringify(row.clauses).replaceAll(',', ', ')}`)
    lines.push(`    }${index + 1 < categories.length ? ',' : ''}`)
  })
  lines.push('  ]')
  lines.push('}')
  return `${lines.join('\n')}\n`
}

const bytes = await source()
const text = generate(bytes)
if (mode === 'write') {
  writeFileSync(target, text)
  console.log(`unicode-categories.json written from Unicode ${VERSION}`)
} else {
  const current = readFileSync(target, 'utf8')
  const recorded = JSON.parse(current).source_sha256
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (recorded !== actual) {
    console.error(`unicode-categories.json records SHA-256 ${recorded}, the source has ${actual}`)
    process.exit(1)
  }
  if (current !== text) {
    console.error('unicode-categories.json is not current: run node scripts/spec2-unicode.mjs --write')
    process.exit(1)
  }
  console.log(`unicode-categories.json: current for Unicode ${VERSION}`)
}
