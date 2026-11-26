// Resolves a merge or rebase conflict in spec/0.2/conformance/clause-cases.json.
// Cases already on the target branch keep their ids; a case the moving side added
// under an id the target already uses gets the next free id, and references to it
// are rewritten in the files the moving side changed. The file is hand-formatted,
// so it is edited span by span and never re-serialized.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CASES_PATH = 'spec/0.2/conformance/clause-cases.json'

// Spans of the elements of the top-level "cases" array, as [start, end) offsets.
export function caseSpans(text) {
  const key = text.indexOf('"cases"')
  if (key < 0) throw new Error('no "cases" member')
  let i = text.indexOf('[', key)
  const spans = []
  let depth = 0
  let start = -1
  let inString = false
  for (i += 1; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{' || ch === '[') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}' || ch === ']') {
      if (depth === 0) return { spans, close: i }
      depth--
      if (depth === 0) spans.push([start, i + 1])
    }
  }
  throw new Error('unterminated "cases" array')
}

function parseCases(text) {
  const { spans, close } = caseSpans(text)
  const cases = spans.map(([s, e]) => {
    const body = text.slice(s, e)
    return { id: JSON.parse(body).id, s, e, body }
  })
  return { cases, close }
}

const num = (id) => Number(id.slice(3))
const fmt = (n, width) => `CC-${String(n).padStart(width, '0')}`

// base: the common ancestor, keep: the target branch, move: the side whose new ids yield.
export function mergeCases(baseText, keepText, moveText) {
  const base = new Map(parseCases(baseText).cases.map((c) => [c.id, c.body]))
  const keep = parseCases(keepText)
  const keepById = new Map(keep.cases.map((c) => [c.id, c]))
  const move = parseCases(moveText).cases
  const moveIds = new Set(move.map((c) => c.id))
  const width = Math.min(...keep.cases.map((c) => c.id.length - 3))
  let next = Math.max(0, ...keep.cases.map((c) => num(c.id)), ...move.map((c) => num(c.id))) + 1
  const replace = new Map()
  const conflicts = []
  const renames = {}
  const appended = []

  for (const c of move) {
    if (base.has(c.id)) {
      const k = keepById.get(c.id)
      if (c.body === base.get(c.id)) continue
      if (!k) conflicts.push(`${c.id}: changed on the moving side, removed on the target`)
      else if (k.body === base.get(c.id)) replace.set(c.id, c.body)
      else if (k.body !== c.body) conflicts.push(`${c.id}: changed on both sides`)
    } else if (keepById.has(c.id)) {
      if (keepById.get(c.id).body === c.body) continue
      const id = fmt(next++, width)
      renames[c.id] = id
      appended.push(c.body.replace(`"id": "${c.id}"`, `"id": "${id}"`))
    } else {
      appended.push(c.body)
    }
  }
  for (const [id, body] of base) {
    if (moveIds.has(id) || !keepById.has(id)) continue
    if (keepById.get(id).body === body) replace.set(id, null)
    else conflicts.push(`${id}: removed on the moving side, changed on the target`)
  }
  if (conflicts.length) return { conflicts, renames: {}, text: null }

  // Ranged edits on the target's text, applied back to front.
  const kc = keep.cases
  const edits = []
  for (let i = 0; i < kc.length; i++) {
    const r = replace.get(kc[i].id)
    if (r === undefined) continue
    if (r !== null) { edits.push([kc[i].s, kc[i].e, r]); continue }
    let j = i
    while (j + 1 < kc.length && replace.get(kc[j + 1].id) === null) j++
    edits.push(i > 0 ? [kc[i - 1].e, kc[j].e, ''] : [kc[0].s, kc[j + 1]?.s ?? kc[j].e, ''])
    i = j
  }
  if (appended.length) {
    const seps = new Map()
    for (let i = 1; i < kc.length; i++) {
      const sp = keepText.slice(kc[i - 1].e, kc[i].s)
      seps.set(sp, (seps.get(sp) ?? 0) + 1)
    }
    const sep = [...seps].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ',\n  '
    const lastKept = [...kc].reverse().find((c) => replace.get(c.id) !== null)
    if (lastKept) edits.push([lastKept.e, lastKept.e, sep + appended.join(sep)])
    else edits.push([keep.close, keep.close, '\n  ' + appended.join(sep) + '\n '])
  }
  edits.sort((a, b) => b[0] - a[0] || b[1] - a[1])
  for (let i = 1; i < edits.length; i++) {
    if (edits[i][1] > edits[i - 1][0]) throw new Error('overlapping edits: merge the removed cases by hand')
  }
  let out = keepText
  for (const [a, b, t] of edits) out = out.slice(0, a) + t + out.slice(b)
  const ids = parseCases(out).cases.map((c) => c.id)
  if (new Set(ids).size !== ids.length) throw new Error('merge produced a duplicate id')
  JSON.parse(out)
  return { conflicts: [], renames, text: out }
}

// Rewrites CC ids in text in one pass, so a chain of renames never applies twice.
export function rewriteIds(text, renames) {
  const keys = Object.keys(renames)
  if (!keys.length) return text
  const re = new RegExp(`\\b(${keys.map((k) => k.replace('-', '\\-')).join('|')})\\b`, 'g')
  return text.replace(re, (m) => renames[m])
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 })
}

function main() {
  const root = git(['rev-parse', '--show-toplevel']).trim()
  const gitDir = git(['rev-parse', '--git-dir'], root).trim()
  const abs = (p) => (p.startsWith('/') ? p : join(root, p))
  const rebasing = existsSync(abs(join(gitDir, 'rebase-merge'))) || existsSync(abs(join(gitDir, 'rebase-apply')))
  const merging = existsSync(abs(join(gitDir, 'MERGE_HEAD')))
  if (!rebasing && !merging) {
    console.error('cc-merge: no rebase or merge in progress')
    process.exit(64)
  }
  // The target keeps its ids: in a rebase that is stage 2, the upstream being built on.
  // In a merge it is the side already contained in --base (default origin/main).
  const flag = process.argv.find((a) => a.startsWith('--keep='))?.slice(7)
  const baseRef = process.argv.find((a) => a.startsWith('--base='))?.slice(7) ?? 'origin/main'
  const inBase = (rev) => {
    try { git(['merge-base', '--is-ancestor', rev, baseRef], root); return true } catch { return false }
  }
  let keepStage = flag === 'ours' ? 2 : flag === 'theirs' ? 3 : rebasing ? 2 : inBase('MERGE_HEAD') ? 3 : inBase('HEAD') ? 2 : 0
  if (!keepStage) {
    console.error(`cc-merge: neither side is in ${baseRef}; pass --keep=ours or --keep=theirs`)
    process.exit(64)
  }
  const moveStage = keepStage === 2 ? 3 : 2
  const show = (stage) => git(['show', `:${stage}:${CASES_PATH}`], root)
  const { conflicts, renames, text } = mergeCases(show(1), show(keepStage), show(moveStage))
  if (conflicts.length) {
    console.error(`cc-merge: ${conflicts.length} case(s) need a manual merge:\n  ${conflicts.join('\n  ')}`)
    process.exit(2)
  }
  writeFileSync(join(root, CASES_PATH), text)
  // Ids are rewritten only in files the moving side changed and the target did not:
  // in a file both sides changed, a target reference to the old id would be redirected.
  const moveRef = rebasing ? 'REBASE_HEAD' : keepStage === 3 ? 'HEAD' : 'MERGE_HEAD'
  const keepRef = rebasing ? 'HEAD' : keepStage === 3 ? 'MERGE_HEAD' : 'HEAD'
  const changed = (from, to) => new Set(git(['diff', '--name-only', from, to], root).split('\n').filter((f) => f && f !== CASES_PATH))
  const moveFiles = changed(rebasing ? 'REBASE_HEAD^' : git(['merge-base', 'HEAD', 'MERGE_HEAD'], root).trim(), moveRef)
  const keepFiles = changed(git(['merge-base', moveRef, keepRef], root).trim(), keepRef)
  const manual = []
  for (const f of moveFiles) {
    const p = join(root, f)
    if (!existsSync(p) || !Object.keys(renames).length) continue
    const before = readFileSync(p, 'utf8')
    const after = rewriteIds(before, renames)
    if (after === before) continue
    if (keepFiles.has(f)) manual.push(f)
    else writeFileSync(p, after)
  }
  if (manual.length) console.log(`cc-merge: both sides changed ${manual.join(', ')}; rewrite the renamed ids there by hand`)
  const pairs = Object.entries(renames)
  console.log(pairs.length ? `cc-merge: renumbered ${pairs.map(([a, b]) => `${a} -> ${b}`).join(', ')}` : 'cc-merge: no renumbering needed')
  console.log(`cc-merge: ${CASES_PATH} written; check other conflicted files, then git add`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
