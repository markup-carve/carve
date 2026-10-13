// Pipe-table editing for the playground editor: align a table's columns, and
// move between cells with Tab / Shift+Tab. A row keeps each cell's opener as
// written (`|`, `|=`, `|=>`, `|<^`, a glued `{attrs}`, or `+` on a
// continuation row) and only the padding around cell text changes. A table
// whose render would change is left alone.
import type { EditorState, Text } from '@codemirror/state'
import type { Command, EditorView } from '@codemirror/view'
import { carveToHtml } from '@markup-carve/carve'

interface Cell {
  opener: string
  text: string
}
interface Row {
  lead: string
  cells: Cell[]
  tail: string
  separator: boolean
}

// `|` plus a glued header `=`, alignment and cell attribute block. Alignment
// counts only before a space or `{` (`|<x` is content), and a data cell's lone
// `<` before the closing pipe is a column span, as the grammars read it.
const OPENER = /^\|(?:=(?:(?:[<~>][\^~v]|\?[\^~v]|[<~>])(?=[ \t{]))?|(?:(?:[<~>][\^~v]|\?[\^~v]|[~>]|<(?![ \t]*\|))(?=[ \t{]))?)(?:\{[^}\n]*\})?/
const SEPARATOR_CELL = /^:?-+:?$/

// Offsets of the unescaped `|` outside code spans.
function pipes(line: string): number[] {
  const out: number[] = []
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\') {
      i++
    } else if (ch === '`') {
      let run = 1
      while (line[i + run] === '`') run++
      const close = line.indexOf('`'.repeat(run), i + run)
      if (close < 0) {
        i += run - 1
      } else {
        i = close + run - 1
      }
    } else if (ch === '|') {
      out.push(i)
    }
  }
  return out
}

function parseRow(line: string): Row | null {
  const lead = /^[ \t]*/.exec(line)![0]
  const body = line.slice(lead.length)
  const continuation = body.startsWith('+')
  if (!continuation && !body.startsWith('|')) return null
  const at = pipes(body)
  const last = at[at.length - 1]
  if (last === undefined) return null
  const tail = body.slice(last + 1)
  if (!/^(?:\{[^}\n]*\})?[ \t]*$/.test(tail)) return null
  const starts = continuation ? [0, ...at.slice(0, -1)] : at.slice(0, -1)
  if (!starts.length || (!continuation && starts[0] !== 0)) return null
  const cells: Cell[] = []
  for (let i = 0; i < starts.length; i++) {
    const segment = body.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : last)
    const opener = continuation && i === 0 ? '+' : OPENER.exec(segment)![0]
    cells.push({ opener, text: segment.slice(opener.length).trim() })
  }
  const separator = !continuation && cells.every((cell) => cell.opener === '|' && SEPARATOR_CELL.test(cell.text))
  return { lead, cells, tail: tail.trimEnd(), separator }
}

function tableAt(doc: Text, lineNumber: number): { first: number; rows: Row[] } | null {
  if (!parseRow(doc.line(lineNumber).text)) return null
  let first = lineNumber
  while (first > 1 && parseRow(doc.line(first - 1).text)) first--
  const rows: Row[] = []
  for (let n = first; n <= doc.lines; n++) {
    const row = parseRow(doc.line(n).text)
    if (!row) break
    rows.push(row)
  }
  return { first, rows }
}

function cellString(cell: Cell): string {
  return cell.text ? `${cell.opener} ${cell.text}` : cell.opener
}

function formatRows(rows: Row[]): string[] {
  const widths: number[] = []
  for (const row of rows) {
    if (row.separator) continue
    row.cells.forEach((cell, c) => { widths[c] = Math.max(widths[c] ?? 0, cellString(cell).length) })
  }
  return rows.map((row) => {
    const parts = row.cells.map((cell, c) => {
      const width = Math.max(widths[c] ?? 0, 2)
      if (row.separator) {
        const left = cell.text.startsWith(':') ? ':' : ''
        const right = cell.text.length > 1 && cell.text.endsWith(':') ? ':' : ''
        return '|' + left + '-'.repeat(width - left.length - right.length) + right
      }
      return cellString(cell).padEnd(width) + ' '
    })
    return row.lead + parts.join('') + '|' + row.tail
  })
}

// Padding only moves whitespace, which HTML text collapses; structure and
// content must match. A row of only blank cells is text, so it differs here.
function renderSame(before: string, after: string): boolean {
  const html = (text: string) => carveToHtml(text).replace(/\s+/g, ' ')
  try {
    return html(before) === html(after)
  } catch {
    return false
  }
}

/** The formatted table around `lineNumber`, or null when there is none or it would render differently. */
function formattedTable(doc: Text, lineNumber: number): { from: number; to: number; first: number; lines: string[] } | null {
  const table = tableAt(doc, lineNumber)
  if (!table) return null
  const from = doc.line(table.first).from
  const to = doc.line(table.first + table.rows.length - 1).to
  const before = doc.sliceString(from, to)
  const lines = formatRows(table.rows)
  // Compared without the shared indent: an indented table alone would be a paragraph.
  const indent = Math.min(...table.rows.map((row) => row.lead.length))
  const dedent = (text: string) => text.split('\n').map((l) => l.slice(indent)).join('\n')
  if (lines.join('\n') !== before && !renderSame(dedent(before), dedent(lines.join('\n')))) return null
  return { from, to, first: table.first, lines }
}

// Where each cell's text sits in any row, formatted or not: [start, end) per cell.
function cellTextSpans(line: string): Array<[number, number]> {
  const row = parseRow(line)
  if (!row || row.separator) return []
  const body = line.slice(row.lead.length)
  const at = pipes(body)
  const marks = body.startsWith('+') ? [0, ...at.slice(0, -1)] : at.slice(0, -1)
  const ends = [...marks.slice(1), at[at.length - 1]]
  return row.cells.map((cell, i) => {
    const segment = body.slice(marks[i] + cell.opener.length, ends[i])
    const start = row.lead.length + marks[i] + cell.opener.length + (segment.length - segment.trimStart().length)
    return [start, start + cell.text.length] as [number, number]
  })
}

// Offset of each cell's text start in a formatted row.
function cellStarts(line: string): number[] {
  const row = parseRow(line)
  if (!row || row.separator) return []
  const out: number[] = []
  let at = row.lead.length
  const body = line.slice(at)
  const marks = body.startsWith('+') ? [0, ...pipes(body).slice(0, -1)] : pipes(body).slice(0, -1)
  row.cells.forEach((cell, i) => {
    const start = at + marks[i] + cell.opener.length
    out.push(Math.min(start + 1, line.length))
  })
  return out
}

// A row being typed under a table: it starts like a row but has no closing pipe yet.
function openRowUnderTable(doc: Text, lineNumber: number): boolean {
  const text = doc.line(lineNumber).text
  return /^[ \t]*[|+]/.test(text) && !parseRow(text) && lineNumber > 1 && parseRow(doc.line(lineNumber - 1).text) !== null
}

function moveCell(direction: 1 | -1): Command {
  const move: Command = (view: EditorView) => {
    const here = view.state.doc.lineAt(view.state.selection.main.head)
    // Close the row being typed, so it joins the table before the move.
    if (direction === 1 && openRowUnderTable(view.state.doc, here.number)) {
      const end = here.from + here.text.replace(/[ \t]+$/, '').length
      view.dispatch({ changes: { from: end, to: here.to, insert: ' |' }, selection: { anchor: end }, userEvent: 'input' })
    }
    return moveWithin(view)
  }
  const moveWithin: Command = (view: EditorView) => {
    const state = view.state
    const sel = state.selection.main
    const line = state.doc.lineAt(sel.head)
    const formatted = formattedTable(state.doc, line.number)
    if (!formatted) return false
    const rowIndex = line.number - formatted.first
    const column = sel.head - line.from
    let lines = formatted.lines
    // The cell the cursor is in: the last one starting at or before it.
    const starts = cellStarts(lines[rowIndex])
    let cell = 0
    starts.forEach((start, i) => { if (column >= start - 1) cell = i })
    if (!starts.length) cell = direction === 1 ? -1 : 0

    let targetRow = rowIndex
    let targetCell = cell + direction
    // Past the end of a row that is shorter than the table: add the next cell.
    const own = parseRow(lines[rowIndex])!
    const widest = lines.reduce((best, l) => Math.max(best, cellStarts(l).length), 0)
    if (direction === 1 && !own.separator && targetCell >= own.cells.length && own.cells.length < widest) {
      const rows = lines.map((l) => parseRow(l)!)
      rows[rowIndex] = { ...own, cells: [...own.cells, { opener: '|', text: '' }] }
      lines = formatRows(rows)
      targetCell = own.cells.length
    }
    while (true) {
      const here = cellStarts(lines[targetRow] ?? '')
      if (targetCell >= 0 && targetCell < here.length) break
      targetRow += direction
      if (targetRow < 0) return true
      if (targetRow >= lines.length) {
        // Past the last cell: a new empty row with the widest row's column count.
        const lead = /^[ \t]*/.exec(lines[0])![0]
        lines = formatRows([...lines.map((l) => parseRow(l)!), { lead, cells: Array.from({ length: widest }, () => ({ opener: '|', text: '' })), tail: '', separator: false }])
        targetCell = 0
        break
      }
      targetCell = direction === 1 ? 0 : cellStarts(lines[targetRow]).length - 1
    }
    const text = lines.join('\n')
    let offset = formatted.from
    for (let i = 0; i < targetRow; i++) offset += lines[i].length + 1
    // At the end of the cell's text, so typing continues it.
    const row = parseRow(lines[targetRow])!
    offset += cellStarts(lines[targetRow])[targetCell] + row.cells[targetCell].text.length
    view.dispatch({
      changes: { from: formatted.from, to: formatted.to, insert: text },
      selection: { anchor: offset },
      scrollIntoView: true,
      userEvent: 'input',
    })
    return true
  }
  return move
}

export const nextCell = moveCell(1)
export const previousCell = moveCell(-1)

/** Align the table at the cursor; false when the cursor is not in one. */
export const formatTable: Command = (view) => {
  const state: EditorState = view.state
  const line = state.doc.lineAt(state.selection.main.head)
  const formatted = formattedTable(state.doc, line.number)
  if (!formatted) return false
  const text = formatted.lines.join('\n')
  if (text === state.doc.sliceString(formatted.from, formatted.to)) return true
  const column = state.selection.main.head - line.from
  const row = line.number - formatted.first
  let offset = formatted.from
  for (let i = 0; i < row; i++) offset += formatted.lines[i].length + 1
  // Keep the cursor at the same place in the same cell.
  const before = cellTextSpans(line.text)
  const after = cellTextSpans(formatted.lines[row])
  let target = Math.min(column, formatted.lines[row].length)
  const cell = before.findLastIndex(([start]) => column >= start - 1)
  if (column >= line.text.trimEnd().length) target = formatted.lines[row].length
  else if (cell >= 0 && after[cell]) target = after[cell][0] + Math.max(0, Math.min(column - before[cell][0], after[cell][1] - after[cell][0]))
  view.dispatch({
    changes: { from: formatted.from, to: formatted.to, insert: text },
    selection: { anchor: offset + target },
    userEvent: 'input',
  })
  return true
}
