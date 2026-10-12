const cosmetic = new Set(['pos', 'position', 'srcByteLength', 'bulletChar', 'marker', 'delim', 'ref', 'rawRef', 'separatorWidths', 'tight', 'boldItalic', 'order'])
// PCRE's Unicode \s includes NEL but excludes JavaScript's BOM whitespace.
const collapse = value => value.replace(/[\p{Z}\t\n\v\f\r\u0085]+/gu, ' ')
export function normalize(value) {
  if (typeof value === 'string') return collapse(value)
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    const merged = []
    for (let node of value.map(normalize)) {
      if (['comment', 'comment_block', 'block_comment', 'inline_comment'].includes(node?.type)) continue
      if (node?.type === 'soft_break') node = { type: 'text', value: ' ' }
      const last = merged.at(-1)
      if (node?.type === 'text' && last?.type === 'text') last.value = collapse(last.value + node.value)
      else merged.push(node)
    }
    return merged
  }
  if (value.type === 'escaped_text') value = { type: 'text', value: value.value ?? '' }
  const out = {}
  for (const [key, item] of Object.entries(value)) {
    if (cosmetic.has(key)) continue
    if (key === 'attrs' && item && typeof item === 'object' && Object.keys(item).every(k => k === 'order')) continue
    out[key] = normalize(key === 'type' && item === 'autolink' ? 'link' : item)
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
export function record(stats, file, diff, error, message) {
  stats.total++
  if (!diff && !error) { stats.identical++; return }
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
  if (value?.version !== 1) throw new Error('Unsupported baseline version')
  for (const engine of ['js', 'php', 'rs']) for (const target of ['html', 'md']) {
    const row = value.engines?.[engine]?.[target]
    if (row === null) continue
    if (!row || !Number.isInteger(row.identical) || !Number.isInteger(row.total) || row.identical < 0 || row.total < row.identical) throw new Error(`Invalid baseline ${engine}/${target}`)
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
    if (row.status === 'skipped') throw new Error(`${row.engine}/${row.target}: skipped, cannot write baseline`)
    const targets = engines[row.engine] ??= {}
    targets[row.target] = row.status === 'unsupported' ? null : { identical: row.identical, total: row.total }
  }
  return { version: 1, engines }
}
