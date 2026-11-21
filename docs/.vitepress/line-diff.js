// Line diff (Myers, O((N+M)D)) for the playground's formatted-source tab.

function lines(text) {
  const parts = text.split('\n')
  if (parts.at(-1) === '') parts.pop()
  return parts
}

// Past this many edits the middle is shown as one removed block and one added block, which bounds time and memory.
const MAX_EDITS = 1000

/** The edit script from `before` to `after`, as `{ kind: 'same' | 'del' | 'add', text }` entries in order. */
export function diffLines(before, after) {
  const a = lines(before)
  const b = lines(after)
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB-- }
  const same = (from, to) => a.slice(from, to).map((text) => ({ kind: 'same', text }))
  return [...same(0, start), ...middle(a.slice(start, endA), b.slice(start, endB)), ...same(endA, a.length)]
}

function middle(a, b) {
  const n = a.length
  const m = b.length
  const max = Math.min(n + m, MAX_EDITS)
  // trace[d] holds the furthest x of diagonals -d..d before step d, so memory grows with the edits, not the length.
  const trace = []
  let v = new Int32Array(3)
  let found = false
  for (let d = 0; d <= max && !found; d++) {
    const next = new Int32Array(2 * d + 3)
    trace.push(v)
    const at = (row, k, width) => row[k + width]
    for (let k = -d; k <= d; k += 2) {
      const prevWidth = d
      const down = k === -d || (k !== d && at(v, k - 1, prevWidth) < at(v, k + 1, prevWidth))
      let x = down ? at(v, k + 1, prevWidth) : at(v, k - 1, prevWidth) + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) { x++; y++ }
      next[k + d + 1] = x
      if (x >= n && y >= m) { found = true; break }
    }
    v = next
  }
  if (!found) return [...a.map((text) => ({ kind: 'del', text })), ...b.map((text) => ({ kind: 'add', text }))]
  const out = []
  let x = n
  let y = m
  for (let d = trace.length - 1; d >= 0; d--) {
    const row = trace[d]
    const k = x - y
    const get = (kk) => row[kk + d]
    const prev = k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1
    const px = d === 0 ? 0 : get(prev)
    const py = d === 0 ? 0 : px - prev
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
