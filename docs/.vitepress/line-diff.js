// Line diff (Myers, O((N+M)D)) for the playground's formatted-source tab.

function lines(text) {
  const parts = text.split('\n')
  if (parts.at(-1) === '') parts.pop()
  return parts
}

/** The edit script from `before` to `after`, as `{ kind: 'same' | 'del' | 'add', text }` entries in order. */
export function diffLines(before, after) {
  const a = lines(before)
  const b = lines(after)
  const n = a.length
  const m = b.length
  const max = n + m
  const offset = max + 1
  const v = new Int32Array(2 * max + 3)
  const trace = []
  let done = false
  for (let d = 0; d <= max && !done; d++) {
    trace.push(v.slice())
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) { x++; y++ }
      v[offset + k] = x
      if (x >= n && y >= m) { done = true; break }
    }
  }
  const out = []
  let x = n
  let y = m
  for (let d = trace.length - 1; d >= 0; d--) {
    const row = trace[d]
    const k = x - y
    const prev = k === -d || (k !== d && row[offset + k - 1] < row[offset + k + 1]) ? k + 1 : k - 1
    const px = row[offset + prev]
    const py = px - prev
    while (x > px && y > py) {
      y--
      out.push({ kind: 'same', text: a[--x] })
    }
    if (d === 0) break
    if (x === px) out.push({ kind: 'add', text: b[--y] })
    else out.push({ kind: 'del', text: a[--x] })
  }
  return out.reverse()
}

/** Folds runs of unchanged lines longer than `2 * context` into `{ kind: 'skip', count }`. */
export function foldDiff(entries, context = 3) {
  const out = []
  let run = []
  const flush = (last) => {
    const keepStart = out.length ? context : 0
    const keepEnd = last ? 0 : context
    if (run.length > keepStart + keepEnd + 1) {
      out.push(...run.slice(0, keepStart), { kind: 'skip', count: run.length - keepStart - keepEnd }, ...run.slice(run.length - keepEnd))
    } else out.push(...run)
    run = []
  }
  for (const entry of entries) {
    if (entry.kind === 'same') { run.push(entry); continue }
    flush(false)
    out.push(entry)
  }
  flush(true)
  return out
}
