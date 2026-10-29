/*
 * Triage of reduced fuzz findings, the pure half: what a finding is made of
 * (block constructs, containers, column relations, inline tokens), where the
 * participants part ways in the output, and the cluster key built from both.
 *
 * scripts/triage-findings.mjs renders and matches; tests/triage-findings.test.mjs
 * drives everything here with literal outputs.
 */
import { agreementPattern } from './mutation-fuzz.mjs'

const CONTAINERS = [
  ['quote', /^>+ ?/],
  ['term', /^:: /],
  ['colon', /^: /],
  ['ordered', /^(?:\d+|[a-zA-Z])[.)](?: |$)/],
  ['dot', /^\.(?: |$)/],
  ['bullet', /^[-*](?: |$)(?!-)/],
  ['plus-item', /^\+ (?=\S)/],
]

const TERMINALS = [
  ['blank', /^$/],
  ['fence', /^(?:`{3,}|~{3,})/],
  ['raw-div', /^:{3,} ?[|\\]/],
  ['div', /^:{3,}/],
  ['plus', /^\+\s*$/],
  ['table', /^\|/],
  ['caption', /^\^ /],
  ['footnote-def', /^\[\^[^\]]*\]:/],
  ['ref-def', /^\[[^\]]+\]:/],
  ['abbr-def', /^\*\[[^\]]+\]:/],
  ['heading', /^#{1,6}(?: |$)/],
  ['rule', /^(?:-{3,}|\*{3,})\s*$/],
  ['attr', /^\{[^}]*\}\s*$/],
  ['comment', /^%%/],
  ['math', /^\$\$/],
]

const INLINE = [
  ['code', /`/],
  ['emph', /[*_/~=](?=\S)|(?<=\S)[*_/~=]/],
  ['brace', /\{[\^,+\-=~%]|[\^,+\-=~%]\}/],
  ['link', /\]\(|\]\[/],
  ['bracket', /\[/],
  ['attr', /\{[.#][^}]*\}|\{[a-z][\w-]*=/],
  ['escape', /\\./],
  ['footnote-ref', /\[\^|\^\[/],
  ['math', /\$`/],
  ['tab', /\t/],
]

/**
 * One line peeled into its container chain, the block it ends in, and the
 * columns: where the line starts and where its content starts.
 */
export function lineParts(line) {
  const indent = line.match(/^[ \t]*/)[0]
  let rest = line.slice(indent.length)
  let column = indent.replace(/\t/g, '    ').length
  const chain = []
  for (let guard = 0; guard < 16; guard++) {
    const hit = CONTAINERS.find(([, re]) => re.test(rest))
    if (!hit) break
    const marker = rest.match(hit[1])[0]
    const pad = rest.slice(marker.length).match(/^ */)[0]
    chain.push(hit[0])
    column += marker.length + pad.length
    rest = rest.slice(marker.length + pad.length)
  }
  const terminal = (TERMINALS.find(([, re]) => re.test(rest)) ?? ['text'])[0]
  return { indent: indent.replace(/\t/g, '    ').length, chain, terminal, column, rest, tab: indent.includes('\t') }
}

/**
 * The features of a reduced document: block kinds, container chains, how
 * each line's start sits against the previous line's content column, and
 * inline tokens. Words never count; only markup does.
 */
export function features(source) {
  const lines = source.replace(/\n$/, '').split('\n')
  const blocks = new Set()
  const chains = new Set()
  const columns = new Set()
  const inline = new Set()
  let prev = null
  for (const line of lines) {
    const p = lineParts(line)
    for (const c of p.chain) blocks.add(c)
    if (p.terminal !== 'text' && p.terminal !== 'blank') blocks.add(p.terminal)
    if (p.chain.length) chains.add(p.chain.join('>'))
    if (p.tab) columns.add('tab')
    if (p.terminal !== 'blank') {
      if (prev && prev.chain.length) {
        columns.add(p.indent < prev.column ? 'below' : p.indent === prev.column ? 'at' : 'beyond')
      } else if (p.indent > 0) columns.add('indented')
      if (p.terminal === 'text') for (const [name, re] of INLINE) if (re.test(p.rest)) inline.add(name)
      prev = p
    }
  }
  return {
    blocks: [...blocks].sort(),
    chains: [...chains].sort(),
    columns: [...columns].sort(),
    inline: [...inline].sort(),
    depth: Math.max(0, ...[...chains].map((c) => c.split('>').length)),
  }
}

const openTags = (html, upto) => {
  const stack = []
  for (const m of html.slice(0, upto).matchAll(/<(\/?)([a-z][a-z0-9]*)[^>]*?(\/?)>/g)) {
    if (m[3] || ['br', 'hr', 'img', 'input', 'col', 'wbr'].includes(m[2])) continue
    if (m[1]) {
      const at = stack.lastIndexOf(m[2])
      if (at >= 0) stack.length = at
    } else stack.push(m[2])
  }
  return stack
}

const nextToken = (html, at) => {
  if (html === undefined) return 'refused'
  if (html.startsWith('ERROR')) return 'error'
  const m = html.slice(at).match(/^\s*(<\/?[a-z][a-z0-9]*|[^<\s])/)
  if (!m) return 'end'
  return m[1].startsWith('<') ? m[1] : 'text'
}

/**
 * Which participants are the odd ones out, as the agreement pattern minus the
 * reference group: the group holding the model, or the largest group when the
 * model refused.
 */
export function oddOnes(pattern) {
  const groups = pattern.split('|').map((g) => g.split(','))
  const ref = groups.find((g) => g.includes('model')) ?? [...groups].sort((a, b) => b.length - a.length || a.join().localeCompare(b.join()))[0]
  return { ref, odd: groups.filter((g) => g !== ref) }
}

/**
 * Where the first odd group's output leaves the reference output: the open
 * element path there (innermost two) and the token each side continues with.
 */
export function divergence(outputs, pattern) {
  const { ref, odd } = oddOnes(pattern)
  if (!odd.length) return null
  const a = outputs[ref[0]] ?? ''
  const b = outputs[odd[0][0]]
  const bs = b ?? ''
  let i = 0
  while (i < a.length && a[i] === bs[i]) i++
  const lt = a.lastIndexOf('<', i)
  const at = lt > a.lastIndexOf('>', i - 1) ? lt : i
  return {
    path: openTags(a, at).slice(-2).join('>') || 'root',
    ref: nextToken(a, at),
    odd: b === undefined ? 'refused' : nextToken(bs, at),
  }
}

/** Writer findings: the failing checks with their engines, e.g. `semantic:rs idem:php`. */
export function writerChecks(verdict) {
  return verdict.split(' ').filter(Boolean).map((v) => v.startsWith('canon:') ? `canon:${oddOnes(v.slice(6)).odd.map((g) => g.join(',')).join('|')}` : v).sort().join(' ')
}

const tagCounts = (html) => {
  const counts = new Map()
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)[\s>/]/g)) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1)
  return counts
}
const markCounts = (html) => {
  const counts = new Map()
  const text = html.replace(/<[^>]*>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  for (const ch of text.match(/[^\p{L}\p{N}\s]/gu) ?? []) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  return counts
}
const delta = (a, b) => {
  const out = []
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const d = (b.get(k) ?? 0) - (a.get(k) ?? 0)
    if (d) out.push(`${d > 0 ? '+' : '-'}${k}`)
  }
  return out.sort().join(' ')
}

/**
 * What the odd output does against the reference, ignoring words and counts:
 * the elements it adds or drops, else the markup characters it shows or eats
 * as text, else `ws` for a whitespace-only difference.
 */
export function outputDelta(ref, odd) {
  if (odd === undefined) return 'refused'
  if (odd.startsWith('ERROR')) return 'error'
  if (ref === undefined) return 'model-refused'
  const tags = delta(tagCounts(ref), tagCounts(odd))
  if (tags) return tags
  const marks = delta(markCounts(ref), markCounts(odd))
  if (marks) return `text ${marks}`
  return ref.replace(/\s+/g, '') === odd.replace(/\s+/g, '') ? 'ws' : 'text'
}

/**
 * The cluster a finding belongs to and its coarser family. The family is who
 * disagrees and what the odd output does differently; the cluster adds the
 * block constructs, so one engine gap seen through two unrelated constructs
 * stays two clusters.
 */
export function clusterKey(finding) {
  const f = features(finding.reduced)
  const blocks = f.blocks.join('+') || (f.inline.length ? `inline:${f.inline.join('+')}` : 'text')
  if (finding.kind === 'writer') {
    const family = `writer ${writerChecks(finding.pattern)}`
    return { family, cluster: `${family} [${blocks}]`, features: f }
  }
  const { ref, odd } = oddOnes(finding.pattern)
  const what = odd.map((g) => `${g.join(',')}: ${outputDelta(finding.outputs[ref[0]], finding.outputs[g[0]])}`).join(' | ')
  return { family: what, cluster: `${what} [${blocks}]`, features: f, divergence: divergence(finding.outputs, finding.pattern) }
}

const flat = (f) => new Set([...f.blocks, ...f.chains.map((c) => `chain:${c}`), ...f.columns.map((c) => `col:${c}`), ...f.inline.map((c) => `inl:${c}`)])

/** Jaccard similarity of two feature sets. */
export function similarity(a, b) {
  const A = flat(a)
  const B = flat(b)
  const both = [...A].filter((x) => B.has(x)).length
  return both / Math.max(1, A.size + B.size - both)
}

/** Group keyed findings into clusters, the shortest reproduction first. */
export function cluster(keyed) {
  const groups = new Map()
  for (const k of keyed) {
    const g = groups.get(k.cluster) ?? { cluster: k.cluster, family: k.family, members: [] }
    g.members.push(k)
    groups.set(k.cluster, g)
  }
  for (const g of groups.values()) g.members.sort((a, b) => a.finding.reduced.length - b.finding.reduced.length || a.finding.id.localeCompare(b.finding.id))
  return [...groups.values()].sort((a, b) => b.members.length - a.members.length || a.cluster.localeCompare(b.cluster))
}

/**
 * The known reproduction a cluster matches: one with the same cluster key, else
 * one in the same family whose features are close enough. `minSimilarity` is
 * the family fallback's threshold.
 */
export function matchCluster(group, known, minSimilarity = 0.5) {
  const exact = known.filter((k) => k.cluster === group.cluster)
  if (exact.length) return { how: 'exact', refs: [...new Set(exact.map((k) => k.ref))] }
  const rep = group.members[0].features
  const near = known
    .filter((k) => k.family === group.family)
    .map((k) => ({ k, s: similarity(rep, k.features) }))
    .filter((x) => x.s >= minSimilarity)
    .sort((a, b) => b.s - a.s)
  if (near.length) return { how: 'family', similarity: near[0].s, refs: [...new Set(near.map((x) => x.k.ref))].slice(0, 3) }
  return null
}

/** Carve samples in an issue body: fenced blocks whose info string is not an output or code language. */
export function issueSamples(body) {
  const samples = []
  const re = /^(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n\1[ \t]*$/gm
  for (const m of (body ?? '').matchAll(re)) {
    const info = m[2].trim().toLowerCase()
    if (info && !/^(carve|crv|djot)\b/.test(info)) continue
    if (!m[3].trim()) continue
    samples.push(m[3] + '\n')
  }
  return samples
}

/** Ticket references a ledger reason names, as `owner/repo#N`. */
export const ledgerRefs = (reason) => [...new Set([...reason.matchAll(/markup-carve\/[\w-]+#\d+/g)].map((m) => m[0]))]

/** Normalize a fuzz-nightly report, a sat run file, or a bare findings array. */
export function loadFindings(report, source = 'report') {
  const list = Array.isArray(report) ? report : report.findings ?? report.groups ?? []
  return list.map((f, i) => {
    const writer = Boolean(f.outputs?.fmt)
    return {
      id: f.id ?? `${report.area ?? source}-${report.seed ?? 0}.${report.shard ?? 0}.${i}`,
      area: report.area ?? f.area ?? source,
      kind: writer ? 'writer' : 'html',
      reduced: f.reduced,
      pattern: writer ? f.outputs.fmt.verdict : f.pattern,
      outputs: writer ? f.outputs.fmt : f.outputs,
    }
  })
}

export { agreementPattern }
