import { labelKey } from '../spec/label-key.mjs'

// PART 12 §3 and §7 changed these wire names in contract 2.0.
export function wireContract(tree) {
  if (tree?.astVersion === '2.0') return '2.0'
  if (tree?.astVersion === '1.2') return '1.2'
  let old = false, current = false
  const visit = value => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) { for (const item of value) visit(item); return }
    if (value.type === 'heading_ref' || Object.hasOwn(value, 'bulletChar') ||
        Object.hasOwn(value, 'ref') ||
        (value.type === 'list' && (Object.hasOwn(value, 'ordered') || Object.hasOwn(value, 'items'))) ||
        (value.type === 'table' && Object.hasOwn(value, 'rows')) ||
        (value.type === 'figure' && Object.hasOwn(value, 'target')) ||
        (['code_block', 'raw_block', 'comment'].includes(value.type) && Object.hasOwn(value, 'content'))) old = true
    if (value.type === 'xref' ||
        (Object.hasOwn(value, 'key') && Object.hasOwn(value, 'namespace'))) current = true
    for (const child of Object.values(value)) if (child && typeof child === 'object') visit(child)
  }
  visit(tree)
  if (old && current) throw new Error('mixed 1.2 and 2.0 wire fields')
  return old ? '1.2' : current ? '2.0' : tree?.astVersion === undefined ? '1.2' : null
}

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
    if (node.type === 'link_reference_definition') definitions.add(labelKey(node.key ?? node.label))
  })
  const literalize = node => {
    if (!node || typeof node !== 'object') return
    if (node.children) node.children = node.children.flatMap(child => {
      literalize(child)
      const reference = child.key ?? child.ref
      if (['link', 'image'].includes(child.type) &&
          (child.namespace === 'link' || typeof child.ref === 'string')) {
        // A 2.0 reference keeps its key even when it resolved to a heading; only an unresolved one (no href or src) is literal.
        if (definitions.has(labelKey(reference)) || (child.type === 'link' ? child.href : child.src) !== undefined) return [child]
        return [{ type: 'text', value: child.type === 'image' ? '![' : '[' },
          ...(child.children ?? []), { type: 'text', value: child.rawRef?.match(/\][^\]]*\]$/)?.[0] ?? ']' }]
      }
      // Engines publish a resolved cross-reference's destination as href; without one it renders as its source.
      if ((child.type === 'heading_ref' || child.type === 'xref' && child.namespace === 'heading') &&
          typeof (child.target ?? child.key) === 'string' && child.href === undefined) {
        return [{ type: 'text', value: `</#${child.target ?? child.key}>` }]
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
      bodies.set(node.key ?? node.label, node)
      return
    }
    if (['link', 'image'].includes(node.type) && (node.namespace === 'link' || typeof node.ref === 'string')) references.add(labelKey(node.key ?? node.ref))
    if (node.type === 'footnote_ref' && !footnotes.has(node.key ?? node.label)) {
      footnotes.add(node.key ?? node.label)
      pending.push(node.key ?? node.label)
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
      (child.type !== 'link_reference_definition' || references.has(labelKey(child.key ?? child.label))) &&
      (child.type !== 'footnote' || footnotes.has(child.key ?? child.label)))
    for (const child of node.children ?? []) prune(child)
  }
  prune(out)
  return out
}

const cosmetic = new Set(['pos', 'position', 'srcByteLength', 'bulletChar', 'marker', 'delim', 'ref', 'rawRef', 'separatorWidths', 'tight', 'spacing', 'boldItalic', 'order', 'continuationLines', 'cellWraps'])
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
    if (key === 'marker' && value.type === 'list' && item && typeof item === 'object' && !strict) {
      out.marker = { kind: item.kind, ...('start' in item ? { start: item.start } : {}) }
      continue
    }
    if (dropped.has(key)) continue
    // 2.0 moved a link or image's `ref` to `key` + `namespace`; only `ref` was cosmetic, so only these are.
    if (!strict && (key === 'key' || key === 'namespace') && (value.type === 'link' || value.type === 'image')) continue
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
    const bucket = (stats.strictBuckets ??= {})[strictDiff.kind] ??= { count: 0, examples: [] }
    bucket.count++
    bucket.examples.push({ file, ...strictDiff })
    bucket.examples.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0)
    bucket.examples.length = Math.min(bucket.examples.length, 3)
    return
  }
  if (error) stats.errors++
  else stats.different = (stats.different ?? 0) + 1
  const kind = error ? error : diff.kind
  const buckets = error ? (stats.errorBuckets ??= {}) : stats.buckets
  const bucket = buckets[kind] ??= { count: 0, examples: [] }
  bucket.count++
  bucket.examples.push({ file, ...(diff ?? {}), ...(message ? { message } : {}) })
  bucket.examples.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0)
  bucket.examples.length = Math.min(bucket.examples.length, 3)
}
export function validateBaseline(value) {
  if (value?.version !== 2) throw new Error('Unsupported baseline version')
  for (const engine of ['js', 'php', 'rs']) for (const target of ['html', 'md']) {
    const row = value.engines?.[engine]?.[target]
    if (row === null) continue
    if (!row || ![row.identical, row.strict, row.total].every(Number.isInteger) || row.strict < 0 || row.identical < row.strict || row.total < row.identical) throw new Error(`Invalid baseline ${engine}/${target}`)
  }
  return value
}

export function checkCounts(rows, baseline) {
  const notices = []
  let failed = false
  for (const row of rows) {
    const name = `${row.engine}/${row.target}`
    if (row.status === 'skipped') { failed = true; notices.push(`${name}: skipped, cannot gate baseline`); continue }
    const previous = baseline.engines[row.engine][row.target]
    if (row.status === 'unsupported') {
      if (previous !== null) failed = true
      notices.push(`${name}: unsupported${previous !== null ? ', cannot gate baseline' : ', no baseline'}: ${row.reason}`)
      continue
    }
    if (previous === null) { notices.push(`${name}: supported now; review and write a baseline`); continue }
    if (row.total !== previous.total) { failed = true; notices.push(`${name}: corpus total changed (${previous.total} -> ${row.total}); review and rewrite baseline`) }
    if (row.identical < previous.identical) { failed = true; notices.push(`${name}: regression ${row.identical} < ${previous.identical}`) }
    if (row.identical > previous.identical) notices.push(`${name}: raise the baseline ${previous.identical} -> ${row.identical}`)
    if (row.strict < previous.strict) { failed = true; notices.push(`${name}: strict regression ${row.strict} < ${previous.strict}`) }
    if (row.strict > previous.strict) notices.push(`${name}: raise the strict baseline ${previous.strict} -> ${row.strict}`)
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

export function baselineCounts(rows) {
  const engines = {}
  for (const row of rows) {
    if (['skipped', 'declared-lag'].includes(row.status)) throw new Error(`${row.engine}/${row.target}: ${row.status}, cannot write baseline`)
    const targets = engines[row.engine] ??= {}
    targets[row.target] = row.status === 'unsupported' ? null : { identical: row.identical, strict: row.strict, total: row.total }
  }
  return { version: 2, engines }
}
