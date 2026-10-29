import { labelKey } from '../spec/label-key.mjs'
import { compareExceptions, corpusId } from './exception-list.mjs'

// CARVE-P11-028 and carve-js#2905 permit HTML to lose unused definitions and literalize unresolved references.
export function acceptHtmlLosses(tree) {
  const out = structuredClone(tree)
  const definitions = new Set(), references = new Set(), footnotes = new Set()
  const walk = (node, visit) => {
    if (!node || typeof node !== 'object') return
    visit(node)
    for (const child of node.children ?? []) walk(child, visit)
  }
  walk(out, node => {
    if (node.type === 'link_reference_definition') definitions.add(labelKey(node.label))
  })
  const literalize = node => {
    if (!node || typeof node !== 'object') return
    if (node.children) node.children = node.children.flatMap(child => {
      literalize(child)
      if (['link', 'image'].includes(child.type) && typeof child.ref === 'string' && !definitions.has(labelKey(child.ref))) {
        return [{ type: 'text', value: child.type === 'image' ? '![' : '[' },
          ...(child.children ?? []), { type: 'text', value: child.rawRef?.match(/\][^\]]*\]$/)?.[0] ?? ']' }]
      }
      // Engines publish a resolved cross-reference's destination as href; without one it renders as its source.
      if (child.type === 'heading_ref' && typeof child.target === 'string' && child.href === undefined) {
        return [{ type: 'text', value: `</#${child.target}>` }]
      }
      return [child]
    })
  }
  literalize(out)
  // A reference counts only where it renders: outside notes, or in a note
  // that is itself referenced.
  const bodies = new Map()
  const pending = []
  const collect = node => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'footnote') {
      bodies.set(node.label, node)
      return
    }
    if (['link', 'image'].includes(node.type) && typeof node.ref === 'string') references.add(labelKey(node.ref))
    if (node.type === 'footnote_ref' && !footnotes.has(node.label)) {
      footnotes.add(node.label)
      pending.push(node.label)
    }
    for (const child of node.children ?? []) collect(child)
  }
  collect(out)
  while (pending.length) {
    const body = bodies.get(pending.pop())
    for (const child of body?.children ?? []) collect(child)
  }
  const prune = node => {
    if (!node || typeof node !== 'object') return
    if (node.children) node.children = node.children.filter(child =>
      (child.type !== 'link_reference_definition' || references.has(labelKey(child.label))) &&
      (child.type !== 'footnote' || footnotes.has(child.label)))
    for (const child of node.children ?? []) prune(child)
  }
  prune(out)
  return out
}

const cosmetic = new Set(['pos', 'position', 'srcByteLength', 'bulletChar', 'marker', 'delim', 'ref', 'rawRef', 'separatorWidths', 'tight', 'boldItalic', 'order', 'continuationLines', 'cellWraps'])
// Strict keeps what PART 10 §13 carries; rawRef stays out because §13 does not recover a reference's form.
const strictCosmetic = new Set(['pos', 'position', 'srcByteLength', 'rawRef', 'boldItalic', 'order'])
// PCRE's Unicode \s includes NEL but excludes JavaScript's BOM whitespace.
const collapse = value => value.replace(/[\p{Z}\t\n\v\f\r\u0085]+/gu, ' ')
export function normalize(value, strict = false) {
  if (typeof value === 'string') return collapse(value)
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    const merged = []
    for (let node of value.map(item => normalize(item, strict))) {
      if (['comment', 'comment_block', 'block_comment', 'inline_comment'].includes(node?.type)) continue
      if (node?.type === 'soft_break' || (!strict && node?.type === 'cell_wrap')) node = { type: 'text', value: ' ' }
      const last = merged.at(-1)
      if (node?.type === 'text' && last?.type === 'text') last.value = collapse(last.value + node.value)
      else merged.push(node)
    }
    return merged
  }
  if (!strict && value.type === 'escaped_text') value = { type: 'text', value: value.value ?? '' }
  const dropped = strict ? strictCosmetic : cosmetic
  const out = {}
  for (const [key, item] of Object.entries(value)) {
    if (dropped.has(key)) continue
    // carve#3100: a span placeholder renders nothing, so its `header` is not structural.
    if (key === 'header' && value.span !== undefined) continue
    if (key === 'attrs' && item && typeof item === 'object' && Object.keys(item).every(k => k === 'order')) continue
    out[key] = normalize(!strict && key === 'type' && item === 'autolink' ? 'link' : item, strict)
  }
  // PHP decodes empty JSON objects as empty arrays.
  return Object.keys(out).length ? out : []
}
export function firstDiff(a, b, path = '', context = 'doc') {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ta = a.type ?? null, tb = b.type ?? null
    const here = ta ?? context
    if (ta !== tb) return { path, kind: `type ${context}>${ta ?? '-'} => ${tb ?? '-'}` }
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!Object.hasOwn(a, key) || !Object.hasOwn(b, key)) return { path: `${path}.${key}`, kind: `${Object.hasOwn(a, key) ? 'lost' : 'added'} ${here}.${key}` }
      if (Array.isArray(a) && a.length !== b.length) {
        const types = nodes => Array.from(nodes, n => n?.type ?? '?')
        const left = types(a), right = types(b)
        let i = 0
        while (i < left.length && i < right.length && left[i] === right[i]) i++
        let x = left[i] ?? 'END', y = right[i] ?? 'END'
        if (x === y) {
          i = 0
          while (i < Math.min(a.length, b.length) && JSON.stringify(a[i]) === JSON.stringify(b[i])) i++
          x = `${left[i] ?? 'END'}(content)`; y = right[i] ?? 'END'
        }
        return { path, kind: `seq ${context}> ${x} => ${y}` }
      }
      const diff = firstDiff(a[key], b[key], `${path}.${key}`, Array.isArray(a) ? here : `${here}.${key}`)
      if (diff) return diff
    }
    return null
  }
  return a === b ? null : { path, kind: `value ${context}` }
}
export function record(stats, file, diff, error, message, strictDiff = null) {
  stats.total++
  if (!diff && !error) {
    stats.identical++
    if (!strictDiff) { stats.strict = (stats.strict ?? 0) + 1; return }
    stats.notStrict ??= []
    stats.notStrict.push(corpusId(file))
    const bucket = (stats.strictBuckets ??= {})[strictDiff.kind] ??= { count: 0, examples: [] }
    bucket.count++
    bucket.examples.push({ file, ...strictDiff })
    bucket.examples.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0)
    bucket.examples.length = Math.min(bucket.examples.length, 3)
    return
  }
  if (error) stats.errors++
  else stats.different = (stats.different ?? 0) + 1
  stats.notIdentical ??= []
  stats.notIdentical.push(corpusId(file))
  const kind = error ? error : diff.kind
  const buckets = error ? (stats.errorBuckets ??= {}) : stats.buckets
  const bucket = buckets[kind] ??= { count: 0, examples: [] }
  bucket.count++
  bucket.examples.push({ file, ...(diff ?? {}), ...(message ? { message } : {}) })
  bucket.examples.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0)
  bucket.examples.length = Math.min(bucket.examples.length, 3)
}
// The ids that are not identical, and the identical ids that are not strict.
export const exceptionFiles = (engine, target) => ({
  notIdentical: `structure-${engine}-${target}-not-identical`,
  notStrict: `structure-${engine}-${target}-not-strict`,
})

/**
 * Gate measured rows against their exception lists. `declared(engine, target)`
 * returns `{ notIdentical, notStrict }` (an id array, or null for a missing
 * file), or null where neither exists; an unsupported row is expected to have none.
 */
export function checkExceptions(rows, declared, corpus) {
  const notices = []
  let failed = false
  for (const row of rows) {
    const name = `${row.engine}/${row.target}`
    if (row.status === 'skipped') { failed = true; notices.push(`${name}: skipped, cannot gate`); continue }
    const lists = declared(row.engine, row.target)
    if (row.status === 'unsupported') {
      if (lists !== null) failed = true
      notices.push(`${name}: unsupported${lists !== null ? ', cannot gate its exception lists' : ', no exception lists'}: ${row.reason}`)
      continue
    }
    if (lists === null) { failed = true; notices.push(`${name}: supported but has no exception lists; review and --write them`); continue }
    const files = exceptionFiles(row.engine, row.target)
    const problems = ['notIdentical', 'notStrict'].flatMap(key => lists[key] === null
      ? [`resources/roundtrip/${files[key]} is missing`]
      : compareExceptions({ name: `resources/roundtrip/${files[key]}`, declared: lists[key], failing: row[key] ?? [], corpus }))
    if (problems.length) { failed = true; notices.push(...problems) }
  }
  return { failed, notices }
}

export function jsRoundtrip(js, source, target) {
  const intermediate = target === 'html'
    ? js.carveToHtml(source, { roundtrip: true })
    : js.carveToMarkdown(source, { roundtrip: true })
  const back = target === 'html' ? js.htmlToCarve(intermediate).value : js.markdownToCarve(intermediate)
  return js.carveToAstJson(back)
}

export function finishMeasurement(row) {
  const sort = buckets => Object.fromEntries(Object.entries(buckets).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0])))
  row.buckets = sort(row.buckets)
  row.errorBuckets = sort(row.errorBuckets ?? {})
  row.strictBuckets = sort(row.strictBuckets ?? {})
  row.strict ??= 0
  if (row.status === 'measured' && row.total > 0 && row.errors === row.total) {
    row.status = 'unsupported'
    const [kind, bucket] = Object.entries(row.errorBuckets)[0]
    row.reason = `${kind}: ${bucket.examples[0].message ?? 'every document failed'}`
  }
  return row
}

export function exceptionLists(rows) {
  const lists = []
  for (const row of rows) {
    if (row.status === 'skipped') throw new Error(`${row.engine}/${row.target}: skipped, cannot write exception lists`)
    if (row.status === 'unsupported') continue
    const files = exceptionFiles(row.engine, row.target)
    lists.push({ file: files.notIdentical, ids: [...row.notIdentical ?? []].sort() }, { file: files.notStrict, ids: [...row.notStrict ?? []].sort() })
  }
  return lists
}
