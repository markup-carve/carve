// Classify readiness outcomes against the baseline per case, so new and changed cases never read as regressions.
import { createHash } from 'node:crypto'

export const statusRank = { unsupported: 0, fail: 1, pass: 2 }

// Prose and bookkeeping fields: editing them changes nothing the runner feeds an engine or compares.
const proseFields = new Set(['area', 'why', 'summary', 'reason', 'from', 'clauses', 'clauseScope', 'section', 'number', 'document', 'status', 'title', 'note', 'notes'])

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => [k, canonical(value[k])]))
  return value
}

export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(canonical(value))).digest('hex').slice(0, 16)

export const caseKey = c => `${c.area}/${c.kind}/${c.id}`

// The message templates of every rule the case expects belong to its expectation.
export function caseFingerprint(c, ruleById = new Map()) {
  const input = Object.fromEntries(Object.entries(c).filter(([k]) => !proseFields.has(k)))
  const codes = [...new Set((c.expected?.diagnostics ?? []).map(d => typeof d === 'string' ? d : d.code))].sort()
  return digest({ input, rules: codes.map(code => [code, ruleById.get(code)?.messages ?? null]) })
}

export function classify({ baselineCases, baselineFailures = {}, currentCases, currentFailures = {}, listed = () => false }) {
  const out = { regressions: [], improved: [], known: [], gaps: { listed: [], unlisted: [] }, changed: 0, added: 0, removed: 0 }
  for (const [key, fingerprint] of Object.entries(currentCases)) {
    const now = currentFailures[key] ?? 'pass'
    const before = baselineCases[key]
    if (before === fingerprint) {
      const old = baselineFailures[key] ?? 'pass'
      if (statusRank[now] < statusRank[old]) out.regressions.push({ key, old, now })
      else if (statusRank[now] > statusRank[old]) out.improved.push({ key, old, now })
      else if (now !== 'pass') out.known.push({ key, now })
      continue
    }
    const reason = before === undefined ? 'new' : 'changed'
    out[reason === 'new' ? 'added' : 'changed']++
    if (now !== 'pass') out.gaps[listed(key) ? 'listed' : 'unlisted'].push({ key, now, reason })
  }
  out.removed = Object.keys(baselineCases).filter(key => !(key in currentCases)).length
  return out
}

const sourceGroup = id => id.slice(0, id.lastIndexOf('/'))

// A source is compared only while its file is unchanged; an edited or new file holds expected gaps.
// A blocked source that moves from (a) or (c) to (b) or (d) gets worse too.
export function classifyUpgrade({ baselineDigests, currentDigests, baselineIds, currentIds, baselineClasses, currentClasses = {} }) {
  const old = new Set(baselineIds)
  const regressions = [], gaps = []
  for (const id of currentIds) {
    const worse = old.has(id) && baselineClasses?.[id] !== undefined && upgradeRank(currentClasses[id]) < upgradeRank(baselineClasses[id])
    if (old.has(id) && !worse) continue
    const group = sourceGroup(id)
    if (baselineDigests[group] !== undefined && baselineDigests[group] === currentDigests[group]) regressions.push(id)
    else gaps.push(id)
  }
  return { regressions, gaps }
}

// carve#6163: (b) tool defect and (d) unmapped count against readiness; (a) report row and (c) malformed 0.1 are listed apart.
export const upgradeBarClasses = new Set(['b', 'd'])

// `kinds` maps an upgrade row id to its map kind; `malformed` holds the 0.1 lint rules that mark a malformed source.
export function upgradeClass({ records = [], error, lint = [], kinds, malformed }) {
  if (error !== undefined) return 'b'
  const rows = records.filter(r => kinds.has(r.entry))
  const mismatch = records.filter(r => r.class === 'mismatch').at(-1)
  const line = mismatch?.line ?? 0
  const flagged = lint.filter(w => malformed.has(w.rule))
  // carve#6164: a difference no row explains is read against the whole source.
  if (!rows.length || records.some(r => r.status === 'no mapped row')) return flagged.length ? 'c' : 'd'
  if (flagged.some(w => line === 0 || w.line === line)) return 'c'
  const onLine = rows.filter(r => line === 0 || r.line === line || r.line === 0)
  return (onLine.length ? onLine : rows).some(r => ['rewrite', 'escape'].includes(kinds.get(r.entry))) ? 'b' : 'a'
}

const upgradeRank = id => id === undefined ? 2 : upgradeBarClasses.has(id) ? 0 : 1

export function groupDigests(sources) {
  const groups = new Map()
  for (const [id, source] of sources) {
    const group = sourceGroup(id)
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push([id, source])
  }
  return Object.fromEntries([...groups].sort(([a], [b]) => a.localeCompare(b)).map(([group, rows]) => [group, digest(rows)]))
}

// Case, clause and tree fixture IDs named in the STATUS.md "Engine gaps" sections, with "X-1 to X-9" ranges expanded.
export function listedGaps(markdown) {
  const ids = new Set()
  let level = 0
  for (const line of markdown.split('\n')) {
    const heading = /^(#+)\s+(.*)$/.exec(line)
    if (heading) {
      if (/engine gaps/i.test(heading[2])) { level = heading[1].length; continue }
      if (level && heading[1].length <= level) level = 0
    }
    if (!level) continue
    const text = line.replace(/\b([A-Z][A-Z0-9]*(?:-[A-Z])?)-(\d+) to \1-(\d+)\b/g, (_, prefix, from, to) => {
      const width = from.length
      const range = []
      for (let n = Number(from); n <= Number(to) && range.length < 1000; n++) range.push(`${prefix}-${String(n).padStart(width, '0')}`)
      return range.join(' ')
    })
    for (const match of text.matchAll(/\b(?:CC|C2-[A-Z])-\d+\b/g)) ids.add(match[0])
    for (const match of text.matchAll(/`([a-z]+(?:-[a-z]+)*-\d+)`/g)) ids.add(match[1])
  }
  return ids
}

// Case IDs pad to three digits (CC-001, CC-1207); the prose may write either form.
export function isListed(ids, c) {
  const variants = id => {
    const m = /^(.*-)(\d+)$/.exec(id)
    return m ? [id, `${m[1]}${String(Number(m[2])).padStart(3, '0')}`] : [id]
  }
  const names = new Set([...ids].flatMap(variants))
  return [c.id, ...(c.clauses ?? [])].some(id => names.has(id))
}
