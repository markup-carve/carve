/*
 * Corpus-seeded mutation fuzzing, the pure half: seeded mutators, the agreement
 * pattern across participants, a reducer that keeps that pattern, and the cause
 * signature the nightly job deduplicates issues by.
 *
 * Nothing here renders. The runner (scripts/fuzz-nightly.mjs) passes a render
 * function in, which is what lets tests/mutation-fuzz.test.mjs drive the reducer
 * and the grouping with fake participants.
 */
import { createHash } from 'node:crypto'

/** The UTC date as YYYYMMDD, the nightly seed. */
export const dateSeed = (date = new Date()) => Number(date.toISOString().slice(0, 10).replaceAll('-', ''))

export function rng(seed) {
  let state = seed >>> 0 || 1
  const next = () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296
  const int = (n) => Math.floor(next() * n)
  return { next, int, pick: (xs) => xs[int(xs.length)] }
}

// The fragment set of scripts/fuzz-impls.mjs: openers, markers and delimiters
// at the widths where the corpus is thin.
export const FRAGMENTS = [
  '::: note', '::::', ':::', '::: |', '{.x}', '{#i}', '{', '{}',
  '> ', '>> ', '- ', '* ', '1. ', '. ', ':: t', ':  d', '+ ',
  '| a | b |', '|= a |= b |', '^ cap', '%%', '%%%', '```', '```x',
  '~~~', '$`x`', '!`z`', '[l](u)', '[r][d]', '[d]: u', '*[A]: b',
  '</#h>', '^[fn]', '[^f]', '[^f]: t', '#tag', '@user', '\t', '  ',
  'text', '/i/', '*b*', '_u_', '~s~', '---', '# H', '``', '`',
]

const PREFIXES = ['> ', '  ', ' ', '- ', '1. ', ': ', '+ ', '\t']

const splitLines = (source) => source.replace(/\n$/, '').split('\n')
const joinLines = (lines) => lines.join('\n') + '\n'

/**
 * Each mutator takes the document's lines, the RNG and the donor pool and
 * returns new lines. Every one is a local edit, so a mutant stays close to a
 * corpus document the engines already agree on.
 */
export const MUTATORS = {
  deleteLine: (lines, r) => lines.length > 1 ? lines.toSpliced(r.int(lines.length), 1) : lines,
  duplicateLine: (lines, r) => {
    const i = r.int(lines.length)
    return lines.toSpliced(i, 0, lines[i])
  },
  swapLines: (lines, r) => {
    if (lines.length < 2) return lines
    const i = r.int(lines.length - 1)
    return lines.toSpliced(i, 2, lines[i + 1], lines[i])
  },
  indentLine: (lines, r) => {
    const i = r.int(lines.length)
    return lines.with(i, ' ' + lines[i])
  },
  dedentLine: (lines, r) => {
    const i = r.int(lines.length)
    return lines.with(i, lines[i].replace(/^[ \t]/, ''))
  },
  insertBlank: (lines, r) => lines.toSpliced(r.int(lines.length + 1), 0, ''),
  insertFragmentLine: (lines, r, _donors, fragments = FRAGMENTS) => lines.toSpliced(r.int(lines.length + 1), 0, r.pick(fragments)),
  insertFragmentInline: (lines, r, _donors, fragments = FRAGMENTS) => {
    const i = r.int(lines.length)
    const at = r.int(lines[i].length + 1)
    return lines.with(i, lines[i].slice(0, at) + r.pick(fragments) + lines[i].slice(at))
  },
  prefixRun: (lines, r) => {
    const start = r.int(lines.length)
    const end = Math.min(lines.length, start + 1 + r.int(3))
    const prefix = r.pick(PREFIXES)
    const rest = /^[-+:>]|^1\./.test(prefix) && r.next() < 0.5 ? ' '.repeat(prefix.length) : prefix
    return lines.map((line, i) => i === start ? prefix + line : i > start && i < end ? rest + line : line)
  },
  spliceDonor: (lines, r, donors) => {
    if (!donors.length) return lines
    const donor = splitLines(r.pick(donors))
    const from = r.int(donor.length)
    const run = donor.slice(from, from + 1 + r.int(2))
    return lines.toSpliced(r.int(lines.length + 1), 0, ...run)
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
}
const MUTATOR_NAMES = Object.keys(MUTATORS)

/** One to three mutations of a seed document; returns the mutant and the names applied. */
export function mutate(source, r, donors = [], fragments = FRAGMENTS) {
  let lines = splitLines(source)
  const applied = []
  const n = 1 + r.int(3)
  for (let k = 0; k < n; k++) {
    const name = r.pick(MUTATOR_NAMES)
    lines = MUTATORS[name](lines, r, donors, fragments)
    applied.push(name)
  }
  return { source: joinLines(lines).toWellFormed(), applied }
}

/**
 * Which participants agree, as `a,b|c`: groups of equal output, each sorted,
 * groups sorted. A participant whose value is `undefined` (the model refused)
 * is left out. One group means agreement.
 */
export function agreementPattern(outputs) {
  const groups = new Map()
  for (const [name, value] of Object.entries(outputs).sort(([a], [b]) => a.localeCompare(b))) {
    if (value === undefined) continue
    const key = typeof value === 'string' ? value : JSON.stringify(value)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(name)
  }
  return [...groups.values()].map((g) => g.join(',')).sort().join('|')
}

/** `pattern` with only the `names` participants left in it. */
export const restrictPattern = (pattern, names) => pattern.split('|')
  .map((group) => group.split(',').filter((n) => names.includes(n)).join(','))
  .filter(Boolean)
  .sort()
  .join('|')

export const agrees = (pattern) => !pattern.includes('|')

/**
 * Line-level then character-level deletion while the divergence survives.
 *
 * `keepFirst(candidates)` returns the index of the first candidate that still
 * diverges the same way, or -1; candidates go to it in chunks of `chunk`, so a
 * caller that renders in batches pays one engine start per chunk. `budget`
 * bounds the candidates tried, so one pathological case cannot eat the night.
 * Character passes start only when the document is short enough to finish.
 */
export function reduce(source, keepFirst, { budget = 800, charLimit = 400, chunk = 32 } = {}) {
  let current = source
  let tried = 0
  const firstKept = (candidates) => {
    const usable = [...new Set(candidates)].filter((c) => c.trim() && c !== current)
    for (let at = 0; at < usable.length && tried < budget; at += chunk) {
      const slice = usable.slice(at, Math.min(at + chunk, at + budget - tried))
      tried += slice.length
      const index = keepFirst(slice)
      if (index >= 0) return slice[index]
    }
    return null
  }
  for (let next = current; next !== null && tried < budget; ) {
    const lines = splitLines(current)
    next = firstKept(lines.map((_, i) => joinLines(lines.toSpliced(i, 1))))
    if (next === null && current.length <= charLimit) {
      next = firstKept(Array.from({ length: current.length - 1 }, (_, i) => (current.slice(0, i) + current.slice(i + 1)).toWellFormed()))
    }
    if (next !== null) current = next
  }
  return { source: current, tried }
}

/** Adapt a one-candidate predicate to `reduce`'s chunked interface. */
export const firstWhere = (keep) => (candidates) => candidates.findIndex(keep)

/** The document with every letter or digit run spelled `x`: words do not decide a cause, markup does. */
export const shape = (source) => source.replace(/[\p{L}\p{N}]+/gu, 'x')

/** A stable cause key: agreement pattern plus the reduced document's shape. */
export const signature = (pattern, reduced) =>
  createHash('sha256').update(`${pattern}\n${shape(reduced)}`).digest('hex').slice(0, 16)

export const SIGNATURE_MARKER = 'fuzz-signature:'

/** Group reduced findings by signature, keeping the shortest reproduction of each. */
export function groupFindings(findings) {
  const groups = new Map()
  for (const f of findings) {
    const g = groups.get(f.signature)
    if (!g) groups.set(f.signature, { ...f, hits: 1 })
    else {
      g.hits += 1
      if (f.reduced.length < g.reduced.length) Object.assign(g, { ...f, hits: g.hits })
    }
  }
  return [...groups.values()].sort((a, b) => b.hits - a.hits || a.signature.localeCompare(b.signature))
}

/** Wrap text in a Markdown fence longer than any backtick run inside it. */
export function fence(text, info = '') {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length))
  const bar = '`'.repeat(longest + 1)
  return `${bar}${info}\n${text.replace(/\n$/, '')}\n${bar}`
}

export function issueTitle(group) {
  const firstLine = group.reduced.split('\n').find((l) => l.trim()) ?? ''
  const sample = firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine
  return `fuzz: ${group.pattern} disagree on \`${sample.replaceAll('`', "'")}\``
}

export function issueBody(group, run) {
  const outputs = agreementPattern(group.outputs).split('|').map((names) => {
    const value = group.outputs[names.split(',')[0]]
    return `${names.split(',').map((n) => `**${n}**`).join(', ')}:\n\n${fence(value, 'html')}`
  }).join('\n\n')
  return [
    `The nightly fuzz differential (\`.github/workflows/nightly-fuzz.yml\`) found a mutated corpus document on which the HTML differs. Agreeing groups: \`${group.pattern}\`.`,
    '',
    fence(group.reduced, 'carve'),
    '',
    outputs,
    '',
    `Mutated from \`tests/corpus/${group.origin}\` by ${group.applied.map((m) => `\`${m}\``).join(', ')}; ${group.hits} hit(s) in this run.`,
    `Reproduce: \`node scripts/fuzz-nightly.mjs --seed=${run.seed} --max-mutants=${run.mutants} --budget-minutes=600\` (${run.engines}).`,
    '',
    `${SIGNATURE_MARKER} \`${group.signature}\``,
  ].join('\n')
}

/** Signature -> issues carrying it, from `gh issue list --json number,state,body` rows. */
export function signaturesIn(issues) {
  const found = new Map()
  const marker = new RegExp(`${SIGNATURE_MARKER} \`([0-9a-f]{16})\``, 'g')
  for (const issue of issues) {
    for (const [, sig] of (issue.body ?? '').matchAll(marker)) {
      if (!found.has(sig)) found.set(sig, [])
      found.get(sig).push({ number: issue.number, state: issue.state })
    }
  }
  return found
}

export function issueComment(group, run) {
  return [
    `Seen again by the nightly fuzz differential, seed \`${run.seed}\` (engines: ${run.engines}), ${group.hits} hit(s). Reduced document:`,
    '',
    fence(group.reduced, 'carve'),
  ].join('\n')
}

/**
 * Decide what to do per group given the issues already carrying its signature.
 * An open issue is commented on, a closed one is left alone (the cause was
 * filed and decided), anything else is new up to `cap`. One engine gap tends to
 * surface as many shapes sharing one agreement pattern, so at most `perPattern`
 * new issues per pattern go out in a night, taken round-robin across patterns
 * so a rare split is not crowded out by a common one; the rest wait.
 */
export function plan(groups, existing, cap = 10, perPattern = 3) {
  const actions = []
  let created = 0
  const createdFor = new Map()
  const rank = new Map()
  const ordered = groups
    .map((g) => {
      const n = rank.get(g.pattern) ?? 0
      rank.set(g.pattern, n + 1)
      return { g, n }
    })
    .sort((a, b) => a.n - b.n)
    .map(({ g }) => g)
  for (const g of ordered) {
    const hits = existing.get(g.signature) ?? []
    const open = hits.find((i) => i.state === 'OPEN')
    const samePattern = createdFor.get(g.pattern) ?? 0
    if (open) actions.push({ kind: 'comment', issue: open.number, group: g })
    else if (hits.length) actions.push({ kind: 'known-closed', issue: hits[0].number, group: g })
    else if (created < cap && samePattern < perPattern) {
      actions.push({ kind: 'create', group: g })
      created += 1
      createdFor.set(g.pattern, samePattern + 1)
    } else actions.push({ kind: 'over-cap', group: g })
  }
  return actions
}
