export function delimitedRowCount(raw) {
  if (raw === undefined) return undefined
  const value = String(raw).trim()
  if (value === '') return 1
  if (!/^\d+$/.test(value)) return undefined
  const count = Number(value)
  return Number.isSafeInteger(count) ? count : undefined
}

// Convert a verbatim csv/tsv fence payload into table rows. A quoted field may
// contain a record break. Invalid quoting leaves the original code block intact.
export function delimitedRecords(source, separator) {
  if (source === '') return []
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  let closed = false
  let atStart = true
  let line = 1
  let recordLine = 1
  const finishField = () => {
    row.push(field)
    field = ''
    quoted = false
    closed = false
    atStart = true
  }
  const finishRow = () => {
    finishField()
    rows.push({ cells: row, line: recordLine, endLine: line })
    row = []
    recordLine = line + 1
  }
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
          closed = true
        }
      } else field += ch
      if (ch === '\n') line++
      continue
    }
    if (ch === separator) {
      finishField()
    } else if (ch === '\n') {
      finishRow()
      line++
    } else if (ch === '"') {
      if (!atStart || closed) return null
      quoted = true
      atStart = false
    } else {
      if (closed) return null
      field += ch
      atStart = false
    }
  }
  if (quoted) return null
  if (source.at(-1) !== '\n') finishRow()
  return rows
}

export function delimitedRows(source, separator) {
  return delimitedRecords(source, separator)?.map(record => record.cells) ?? null
}
