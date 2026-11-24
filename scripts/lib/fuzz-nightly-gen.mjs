// Inputs and the pure half of scripts/fuzz-nightly.mjs: seeded generators and mutators for Carve 0.2, the
// agreement pattern, the reducer and the cause signature. Nothing here runs an engine.
import { createHash } from 'node:crypto'

export const dateSeed = (date = new Date()) => Number(date.toISOString().slice(0, 10).replaceAll('-', ''))

export function rng(seed) {
  let state = seed >>> 0 || 1
  const next = () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296
  const int = n => Math.floor(next() * n)
  return { next, int, pick: xs => xs[int(xs.length)], chance: p => next() < p }
}

// Openers, markers and delimiters of 0.2 (syntax-blocks.md, syntax-inline.md).
export const FRAGMENTS = [
  '= H', '== H', '# H', '::: note', '::: warning', '::::', ':::', '::: figure', '{.x}', '{#i}', '{#i .c k=v}', '{', '{}',
  '> ', '>> ', '- ', '* ', '+ ', '1. ', '2) ', '. ', 'a. ', 'i) ', '- [ ] ', '- [x] ', ': ', ':: t', ':  d', 'term', '  ',
  '| a | b |', '|= a |= b |', '|={<} a |={>} b |', '+ c |', '^ cap', '%%', '%% c', '%%%', '```', '```js', '``` csv table',
  '~~~', '$`x`', '$$`x`', '`', '``', '!`z`', '[l](u)', '[r][d]', '[d]: u', '*[A]: b', '[^f]', '[^f]: t', '^[fn]',
  '#tag', '@user', ':sym:', '[[w]]', '[@c]', '\t', '*b*', '/i/', '_u_', '~s~', '{^s^}', '{,b,}', '{=m=}', '{+i+}',
  '{-d-}', '{~x~}', '\\', '\\*', '***', '---', '--- ', '...', '"q"', "'a'", '<https://x.y>', 'x@y.z', '[s]{.c}',
  '![i](u)', '[x]{#r}', '<<x>>', ' ', '​', '́', '\u{1F600}', 'א', 'ﬃ', '�', '\r', '\u0000',
]

const PREFIXES = ['> ', '  ', ' ', '- ', '1. ', ': ', '+ ', '\t', '. ', '- [ ] ', '>> ']

const splitLines = source => source.replace(/\n$/, '').split('\n')
const joinLines = lines => lines.join('\n') + '\n'

export const MUTATORS = {
  deleteLine: (lines, r) => lines.length > 1 ? lines.toSpliced(r.int(lines.length), 1) : lines,
  duplicateLine: (lines, r) => { const i = r.int(lines.length); return lines.toSpliced(i, 0, lines[i]) },
  swapLines: (lines, r) => {
    if (lines.length < 2) return lines
    const i = r.int(lines.length - 1)
    return lines.toSpliced(i, 2, lines[i + 1], lines[i])
  },
  indentLine: (lines, r) => { const i = r.int(lines.length); return lines.with(i, r.pick([' ', '  ', '\t']) + lines[i]) },
  dedentLine: (lines, r) => { const i = r.int(lines.length); return lines.with(i, lines[i].replace(/^[ \t]/, '')) },
  insertBlank: (lines, r) => lines.toSpliced(r.int(lines.length + 1), 0, ''),
  insertFragmentLine: (lines, r, donors) => lines.toSpliced(r.int(lines.length + 1), 0, fragment(r, donors)),
  insertFragmentInline: (lines, r, donors) => {
    const i = r.int(lines.length)
    const at = r.int(lines[i].length + 1)
    return lines.with(i, lines[i].slice(0, at) + fragment(r, donors) + lines[i].slice(at))
  },
  prefixRun: (lines, r) => {
    const start = r.int(lines.length)
    const end = Math.min(lines.length, start + 1 + r.int(4))
    const prefix = r.pick(PREFIXES)
    const rest = /^[-+:>.]|^1\./.test(prefix) && r.chance(0.5) ? ' '.repeat(prefix.length) : prefix
    return lines.map((line, i) => i === start ? prefix + line : i > start && i < end ? rest + line : line)
  },
  spliceDonor: (lines, r, donors) => {
    if (!donors.length) return lines
    const donor = splitLines(r.pick(donors))
    const from = r.int(donor.length)
    return lines.toSpliced(r.int(lines.length + 1), 0, ...donor.slice(from, from + 1 + r.int(3)))
  },
  deleteChar: (lines, r) => {
    const i = r.int(lines.length)
    if (!lines[i]) return lines
    const at = r.int(lines[i].length)
    return lines.with(i, lines[i].slice(0, at) + lines[i].slice(at + 1))
  },
  duplicateChar: (lines, r) => {
    const i = r.int(lines.length)
    if (!lines[i]) return lines
    const at = r.int(lines[i].length)
    return lines.with(i, lines[i].slice(0, at + 1) + lines[i].slice(at))
  },
  attachAttributes: (lines, r) => {
    const i = r.int(lines.length)
    return r.chance(0.5) ? lines.toSpliced(i, 0, attributes(r)) : lines.with(i, lines[i] + attributes(r))
  },
}
const MUTATOR_NAMES = Object.keys(MUTATORS)

function fragment(r, donors) {
  if (donors.length && r.chance(0.3)) {
    const line = r.pick(splitLines(r.pick(donors)))
    return line.length > 60 ? line.slice(0, 60) : line
  }
  return r.pick(FRAGMENTS)
}

export function attributes(r) {
  const parts = []
  for (let n = 1 + r.int(4); n > 0; n--) {
    parts.push(r.pick(['#id', '.cls', '.c-2', 'k=v', 'k="a b"', "k='x}'", 'data-x=1', '%c%', '#', '.', '=', 'k=', '"', '{', '}']))
  }
  return `{${parts.join(r.pick([' ', '  ', '\t', '']))}}`
}

/** One to three mutations of a seed document. */
export function mutate(source, r, donors = []) {
  let lines = splitLines(source)
  const applied = []
  for (let n = 1 + r.int(3); n > 0; n--) {
    const name = r.pick(MUTATOR_NAMES)
    lines = MUTATORS[name](lines, r, donors)
    applied.push(name)
  }
  return { source: joinLines(lines).toWellFormed(), applied }
}

const INLINE = ['x', 'word', ' ', '*b*', '_e_', '/i/', '`c`', '$`m`', '[l](u)', '![i](u)', '{^s^}', '{,s,}', '{=m=}',
  '[^f]', '^[note]', '#tag', '@u', '<https://a.b>', '\\*', '{.c}', '[s]{#i}', '%% c %%', '"q"', '--', '...', '[[w]]']

/** Deeply nested shapes at depth `n`, around the limits of C2-B-190 and C2-I-118. */
export const DEEP = {
  quotes: (n) => `${'> '.repeat(n)}x\n`,
  quotesTight: (n) => `${'>'.repeat(n)} x\n`,
  quotesLines: (n) => Array.from({ length: n }, (_, i) => `${'> '.repeat(i + 1)}x`).join('\n') + '\n',
  bulletMarkerLine: (n) => `${'- '.repeat(n)}x\n`,
  orderedMarkerLine: (n) => `${'1. '.repeat(n)}x\n`,
  descMarkerLine: (n) => `term\n${': '.repeat(n)}x\n`,
  bulletIndented: (n) => Array.from({ length: n }, (_, i) => `${'  '.repeat(i)}- x`).join('\n') + '\n',
  orderedIndented: (n) => Array.from({ length: n }, (_, i) => `${'   '.repeat(i)}1. x`).join('\n') + '\n',
  divs: (n) => {
    const open = Array.from({ length: n }, (_, i) => `${':'.repeat(n + 3 - i)} d${i}`)
    const close = Array.from({ length: n }, (_, i) => ':'.repeat(i + 4))
    return [...open, 'x', ...close].join('\n') + '\n'
  },
  quotedLists: (n) => `${'> - '.repeat(n)}x\n`,
  footnoteChain: (n) => Array.from({ length: n }, (_, i) => `[^f${i}]: x [^f${i + 1}]`).join('\n') + '\nx [^f0]\n',
  sup: (n) => `${'{^'.repeat(n)}x${'^}'.repeat(n)}\n`,
  brackets: (n) => `${'['.repeat(n)}x${']'.repeat(n)}\n`,
  links: (n) => `${'[a '.repeat(n)}x${'](u)'.repeat(n)}\n`,
  emphasis: (n) => { const d = ['*', '_', '/', '~']; let s = 'x'; for (let i = 0; i < n; i++) s = `${d[i % 4]}${s}${d[i % 4]}`; return s + '\n' },
  inlineNotes: (n) => `${'^['.repeat(n)}x${']'.repeat(n)}\n`,
  braces: (n) => `${'{'.repeat(n)}x${'}'.repeat(n)}\n`,
  openersOnly: (n) => `${'{^*['.repeat(n)}x\n`,
  closersOnly: (n) => `x${'^}*]'.repeat(n)}\n`,
  mixedContainers: (n, r) => {
    const pick = ['> ', '- ', '1. ', '. ', '- [ ] ']
    return `${Array.from({ length: n }, () => r.pick(pick)).join('')}x\n`
  },
  quoteInSup: (n) => `${'> '.repeat(n)}${'{^'.repeat(n)}x${'^}'.repeat(n)}\n`,
  tableCells: (n) => `${'| '.repeat(n)}|\n|= ${'a |= '.repeat(n)}|\n`,
  backticks: (n) => `${'`'.repeat(n)}x${'`'.repeat(n - 1)}\n`,
  fenceRun: (n) => `${'`'.repeat(n)}\nx\n${'`'.repeat(n + 1)}\n`,
  attributeChain: (n) => `${'{.a}'.repeat(n)}\nx\n`,
}

/** Long lines and large documents of one construct, for timing (C2-T limits on time are linear). */
export const LONG = {
  plain: (n) => 'x '.repeat(n) + '\n',
  stars: (n) => '*'.repeat(n * 2) + '\n',
  starsSpaced: (n) => '* '.repeat(n) + 'x\n',
  openBrackets: (n) => '['.repeat(n * 2) + '\n',
  bracketPairs: (n) => '[x]'.repeat(n) + '\n',
  linkRefs: (n) => '[x][y] '.repeat(n) + '\n',
  backticks: (n) => '` '.repeat(n) + '\n',
  backtickRuns: (n) => Array.from({ length: n }, (_, i) => '`'.repeat(1 + (i % 7))).join(' ') + '\n',
  braces: (n) => '{'.repeat(n * 2) + '\n',
  bracesClose: (n) => '{^'.repeat(n) + '\n',
  attrs: (n) => '{.a}'.repeat(n) + '\n',
  underscores: (n) => '_a'.repeat(n) + '\n',
  slashes: (n) => '/'.repeat(n * 2) + '\n',
  mixedDelims: (n) => '*_/~'.repeat(n) + '\n',
  lessThan: (n) => '<'.repeat(n * 2) + '\n',
  autolinkish: (n) => '<a:'.repeat(n) + '\n',
  notesOpen: (n) => '^['.repeat(n) + '\n',
  dollars: (n) => '$`'.repeat(n) + '\n',
  quotes: (n) => '"\''.repeat(n) + '\n',
  tableRow: (n) => '| a '.repeat(n) + '|\n',
  tableRows: (n) => '| a | b |\n'.repeat(n),
  quoteLines: (n) => '> x\n'.repeat(n),
  listItems: (n) => '- x\n'.repeat(n),
  laddered: (n) => Array.from({ length: n }, (_, i) => `${' '.repeat(i % 40)}- x`).join('\n') + '\n',
  defs: (n) => Array.from({ length: n }, (_, i) => `[d${i}]: u`).join('\n') + '\n' + '[d0] '.repeat(n) + '\n',
  footnotes: (n) => Array.from({ length: n }, (_, i) => `[^f${i}]: t`).join('\n') + '\n' + '[^f0] '.repeat(n) + '\n',
  headings: (n) => '= H\n\n'.repeat(n),
  sameHeadings: (n) => '= Same\n'.repeat(n),
  colons: (n) => ':'.repeat(n * 2) + '\n',
  fences: (n) => '```\n'.repeat(n),
  divOpeners: (n) => ':::\n'.repeat(n),
  comments: (n) => '%%\n'.repeat(n),
  blankLines: (n) => 'x\n' + '\n'.repeat(n) + 'x\n',
  tabs: (n) => '\t'.repeat(n) + 'x\n',
  indentedLines: (n) => Array.from({ length: n }, () => '      x').join('\n') + '\n',
  crlf: (n) => 'x\r\n'.repeat(n),
  cr: (n) => 'x\r'.repeat(n),
  nul: (n) => 'x\u0000'.repeat(n),
  escapes: (n) => '\\'.repeat(n * 2) + '\n',
  wide: (n) => '中'.repeat(n) + '\n',
  combining: (n) => 'é'.repeat(n) + '\n',
  attrLines: (n) => '{.a}\n'.repeat(n) + 'x\n',
  captions: (n) => '^ c\n'.repeat(n),
  descriptions: (n) => 'term\n: d\n'.repeat(n),
  tasks: (n) => '- [ ] x\n'.repeat(n),
  abbr: (n) => '*[A]: b\n'.repeat(n) + 'A '.repeat(n) + '\n',
  tags: (n) => '#t '.repeat(n) + '\n',
  smart: (n) => '"a\' '.repeat(n) + '\n',
}

function inlineRun(r, n) {
  let s = ''
  while (s.length < n) s += r.pick(INLINE)
  return s
}

/** A random document from block templates. */
export function randomDocument(r) {
  const blocks = []
  for (let n = 1 + r.int(6); n > 0; n--) {
    const text = () => inlineRun(r, 1 + r.int(40))
    const block = r.pick([
      () => text(), () => `${'='.repeat(1 + r.int(7))} ${text()}`, () => `> ${text()}\n> ${text()}`,
      () => `- ${text()}\n- ${text()}\n  - ${text()}`, () => `1. ${text()}\n2. ${text()}`, () => `- [x] ${text()}`,
      () => `term\n: ${text()}`, () => `\`\`\`${r.pick(['', 'js', 'csv table'])}\n${text()}\n\`\`\``,
      () => `::: ${r.pick(['note', 'figure', 'd', 'quote'])}\n${text()}\n:::`, () => `| ${text()} | b |\n| c | d |`,
      () => `|= a |= b |\n| ${text()} | x |`, () => `[^f]: ${text()}`, () => `[d]: https://x.y`, () => '***',
      () => `%% ${text()}`, () => `^ ${text()}`, () => attributes(r), () => `---\na: 1\n---`,
      () => `${' '.repeat(r.int(5))}${text()}`, () => `\t${text()}`,
    ])()
    blocks.push(block)
  }
  let doc = blocks.join(r.pick(['\n\n', '\n', '\n\n\n', '\n\n\n\n'])) + '\n'
  if (r.chance(0.1)) doc = doc.replaceAll('\n', '\r\n')
  if (r.chance(0.05)) doc = '﻿' + doc
  return doc
}

/** A random line-ending, tab or control-character variant of a document. */
export function noise(source, r) {
  const k = r.int(6)
  if (k === 0) return source.replaceAll('\n', '\r\n')
  if (k === 1) return source.replaceAll('\n', '\r')
  if (k === 2) return source.replace(/^( {2,4})/gm, '\t')
  if (k === 3) {
    // Insert on a code point boundary: a split surrogate pair is not a Carve source.
    const points = Array.from(source)
    const at = r.int(points.length + 1)
    return points.slice(0, at).join('') + r.pick(['\u0000', '\u000b', '\u000c', '\u0085', ' ', '﻿']) + points.slice(at).join('')
  }
  if (k === 4) return source.replace(/\n$/, '')
  return source.replace(/ /g, () => r.chance(0.2) ? '\t' : ' ')
}

/** Groups of equal output as `a,b|c`; one group means agreement. */
export function agreementPattern(outputs) {
  const groups = new Map()
  for (const [name, value] of Object.entries(outputs).sort(([a], [b]) => a.localeCompare(b))) {
    if (value === undefined) continue
    const key = typeof value === 'string' ? value : JSON.stringify(value)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(name)
  }
  return [...groups.values()].map(g => g.join(',')).sort().join('|')
}

/**
 * Line-level then character-level deletion while `keepFirst` says the finding survives. `keepFirst(candidates)`
 * returns the index of the first candidate that keeps it, or -1.
 */
export function reduce(source, keepFirst, { budget = 600, charLimit = 400, chunk = 48 } = {}) {
  let current = source
  let tried = 0
  const firstKept = (candidates) => {
    const usable = [...new Set(candidates)].filter(c => c.trim() && c !== current)
    for (let at = 0; at < usable.length && tried < budget; at += chunk) {
      const slice = usable.slice(at, Math.min(at + chunk, at + budget - tried))
      tried += slice.length
      const index = keepFirst(slice)
      if (index >= 0) return slice[index]
    }
    return null
  }
  for (let next = current; next !== null && tried < budget;) {
    const lines = splitLines(current)
    next = lines.length > 1 ? firstKept(lines.map((_, i) => joinLines(lines.toSpliced(i, 1)))) : null
    if (next === null && current.length <= charLimit) {
      next = firstKept(Array.from({ length: current.length }, (_, i) => (current.slice(0, i) + current.slice(i + 1)).toWellFormed()))
    }
    if (next !== null) current = next
  }
  return { source: current, tried }
}

/** Letters and digits spelled `x`: words do not decide a cause, markup does. */
export const shape = source => source.replace(/[\p{L}\p{N}]+/gu, 'x')

export const signature = (target, pattern, reduced) =>
  createHash('sha256').update(`${target}\n${pattern}\n${shape(reduced)}`).digest('hex').slice(0, 16)

/** Shape with indentation, blank lines and repeated lines dropped, so column shifts of one cause share a family. */
export function skeleton(source) {
  const lines = splitLines(shape(source)).map(l => l.trim().replace(/\s+/g, ' ')).filter(Boolean)
  return lines.filter((l, i) => l !== lines[i - 1]).join('\n')
}

export const family = (target, pattern, reduced) =>
  createHash('sha256').update(`${target}\n${pattern}\n${skeleton(reduced)}`).digest('hex').slice(0, 16)

/** Wrap text in a Markdown fence longer than any backtick run inside it. */
export function fence(text, info = '') {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map(m => m[0].length))
  const bar = '`'.repeat(longest + 1)
  return `${bar}${info}\n${text.replace(/\n$/, '')}\n${bar}`
}
