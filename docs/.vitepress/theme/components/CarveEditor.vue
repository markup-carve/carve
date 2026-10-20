<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { EditorState, Compartment, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state'
import {
  EditorView,
  Decoration,
  type DecorationSet,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  highlightSpecialChars,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentMore, indentLess } from '@codemirror/commands'
import type { Command } from '@codemirror/view'
import { parse } from '@markup-carve/carve'
import {
  BARE_CONTINUATION_MARKER,
  bareMarkerItem,
  continuationPrefix,
  listContinuationEdits,
  listIndentEdits,
  listItems,
  type ContinuationEdit,
} from '@markup-carve/carve-lsp/browser'
import { carveCompletion, carveDiagnostics, carveHover, carveLanguageTheme, carveTooltips } from '../editor/carve-language'
import { endTableAt, formatTable, isBlankRow, isTableRow, nextCell, previousCell } from '../editor/carve-tables'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'

const props = defineProps<{
  modelValue: string
  wrap: boolean
  // Shared with the output pane so the editor and the rendered code blocks use
  // one Shiki instance and the same Carve TextMate grammar.
  getHighlighter: () => Promise<unknown>
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  // The source to render: the document without the empty marker the cursor sits on, or null for the document itself.
  preview: [value: string | null]
  // The 1-based line the cursor is on, after typing or moving it.
  cursor: [line: number]
}>()

const host = ref<HTMLElement | null>(null)
const view = shallowRef<EditorView | null>(null)
const wrapping = new Compartment()

// Shiki tokenizes the whole document off the edit path; until a pass lands,
// the previous decorations are mapped through the edits so colors stay put.
const setTokens = StateEffect.define<DecorationSet>()
const tokenField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) if (e.is(setTokens)) return e.value
    return tr.docChanged ? deco.map(tr.changes) : deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

const markCache = new Map<string, Decoration>()
const diffAddMark = Decoration.mark({ class: 'cm-carve-diff-add' })
const diffRemoveMark = Decoration.mark({ class: 'cm-carve-diff-remove' })
function markFor(style: string): Decoration {
  let m = markCache.get(style)
  if (!m) {
    m = Decoration.mark({ attributes: { style } })
    markCache.set(style, m)
  }
  return m
}

function styleString(s: string | Record<string, string> | undefined): string {
  if (!s) return ''
  if (typeof s === 'string') return s
  return Object.entries(s)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}

function diffMarkerRanges(text: string, doc: EditorState['doc']): Array<{ from: number; to: number; mark: Decoration }> {
  if (!/\bdiff\b/i.test(text)) return []
  const ranges: Array<{ from: number; to: number; mark: Decoration }> = []
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    const node = value as {
      type?: string
      lang?: string
      attrs?: { classes?: string[] }
      content?: string
      pos?: { startLine?: number; endLine?: number }
    }
    if (node.type === 'code_block' && (node.lang?.toLowerCase() === 'diff' || node.attrs?.classes?.includes('diff'))
      && node.pos?.startLine && node.content) {
      node.content.split('\n').forEach((contentLine, index) => {
        const marker = contentLine[0]
        if (marker !== '+' && marker !== '-') return
        const lineNumber = node.pos!.startLine! + index + 1
        if (lineNumber > doc.lines) return
        if (node.pos?.endLine && lineNumber >= node.pos.endLine && node.pos.endLine <= doc.lines
          && /^[ \t>]*(?:`{3,}|~{3,})[ \t]*$/.test(doc.line(node.pos.endLine).text)) return
        const sourceLine = doc.line(lineNumber)
        if (!sourceLine.text.endsWith(contentLine)) return
        const column = sourceLine.text.length - contentLine.length
        const from = sourceLine.from + column
        ranges.push({ from, to: from + 1, mark: marker === '+' ? diffAddMark : diffRemoveMark })
      })
      return
    }
    for (const [key, child] of Object.entries(node)) {
      if (key !== 'pos' && key !== 'attrs') visit(child)
    }
  }
  try {
    visit(parse(text, { positions: true }))
  } catch {
    return []
  }
  return ranges
}

let highlightTimer: ReturnType<typeof setTimeout> | undefined
let highlightSeq = 0
function scheduleHighlight(delay = 120): void {
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => void highlight(), delay)
}

async function highlight(): Promise<void> {
  const v = view.value
  if (!v) return
  const seq = ++highlightSeq
  const text = v.state.doc.toString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hl = (await props.getHighlighter()) as any
  if (seq !== highlightSeq || !view.value || view.value.state.doc.toString() !== text) return
  let lines
  try {
    lines = hl.codeToTokens(text, {
      lang: 'carve',
      themes: { light: 'github-light', dark: 'github-dark' },
    }).tokens
  } catch {
    return
  }
  const ranges: Array<{ from: number; to: number; mark: Decoration }> = []
  for (const line of lines) {
    for (const t of line) {
      if (!t.content.length) continue
      const style = styleString(t.htmlStyle)
      if (style) ranges.push({ from: t.offset, to: t.offset + t.content.length, mark: markFor(style) })
    }
  }
  const diffRanges = diffMarkerRanges(text, v.state.doc)
  if (diffRanges.length) {
    ranges.push(...diffRanges)
    ranges.sort((a, b) => a.from - b.from || b.to - a.to)
  }
  const builder = new RangeSetBuilder<Decoration>()
  for (const range of ranges) builder.add(range.from, range.to, range.mark)
  view.value.dispatch({ effects: setTokens.of(builder.finish()) })
}

// List and container editing, from the language server's own on-type rules, so the
// playground and the editor integrations agree on what Enter and Tab do.
function applyEdits(v: EditorView, edits: ContinuationEdit[], base?: { from: number; insert: string }, assoc: 1 | -1 = 1, shift = 0): void {
  const mid = base ? v.state.update({ changes: base }) : null
  const state = mid ? mid.state : v.state
  const at = (p: { line: number; character: number }) => state.doc.line(p.line + 1).from + p.character
  const changes = state.changes(edits.map((e) => ({ from: at(e.range.start), to: at(e.range.end), insert: e.newText })))
  const cursor = base ? base.from + base.insert.length : v.state.selection.main.head
  v.dispatch({
    changes: mid ? mid.changes.compose(changes) : changes,
    selection: { anchor: changes.mapPos(cursor, assoc) + shift },
    scrollIntoView: true,
    userEvent: 'input',
  })
}

// 1-based line inside a code or raw block, fences included: no structural prefix there.
function inCodeBlock(text: string, line: number): boolean {
  let found = false
  const visit = (value: unknown): void => {
    if (found || value === null || typeof value !== 'object') return
    if (Array.isArray(value)) return value.forEach(visit)
    const node = value as { type?: string; pos?: { startLine?: number; endLine?: number } }
    const { startLine, endLine } = node.pos ?? {}
    if ((node.type === 'code_block' || node.type === 'raw_block') && startLine !== undefined && endLine !== undefined) {
      if (line >= startLine && line <= endLine) found = true
      return
    }
    for (const [key, child] of Object.entries(node)) if (key !== 'pos') visit(child)
  }
  try {
    visit(parse(text, { positions: true }).children)
  } catch {
    return false
  }
  return found
}

const continueOnEnter: Command = (v) => {
  const sel = v.state.selection
  if (sel.ranges.length !== 1 || !sel.main.empty) return false
  const pos = sel.main.head
  const line = v.state.doc.lineAt(pos)
  // Enter on the bare `|` a table row's Enter wrote, or on a row of blank cells,
  // ends the table, as an empty list marker ends a list.
  if ((/^[ \t]*\|[ \t]*$/.test(line.text) || isBlankRow(line.text)) && rowBelowTable(v.state, line.number)) return endTableAt(v, line.number)
  if (pos !== line.to) return false
  const base = { from: pos, insert: '\n' }
  const text = v.state.doc.sliceString(0, pos) + '\n' + v.state.doc.sliceString(pos)
  const position = { line: line.number, character: 0 }
  const list = listContinuationEdits(text, position)
  if (list) {
    applyEdits(v, list, base)
    return true
  }
  const prefix = continuationPrefix(text, line.number)
  // Text before the first newline goes before the cursor, a closer (`\n:::`, `> \n> :::`) after it.
  const lead = prefix.split('\n', 1)[0]!
  // The server checks closers against code itself, and a new fence opener reads as inside its own block.
  if (!prefix || (lead === prefix && inCodeBlock(text, line.number))) return false
  // A pipe-led line that is neither a table row nor a line-block line is text.
  if (/^[ \t]*\| $/.test(prefix) && !isTableRow(line.text) && !/^[ \t]*\| /.test(line.text)) return false
  applyEdits(v, [{ range: { start: position, end: position }, newText: prefix }], base, -1, lead.length)
  return true
}

// The line above is a table row or a line-block line, and neither is code.
function rowBelowTable(state: EditorState, lineNumber: number): boolean {
  if (lineNumber < 2) return false
  const above = state.doc.line(lineNumber - 1).text
  if (!isTableRow(above) && !/^[ \t]*\| /.test(above)) return false
  return !inCodeBlock(state.doc.toString(), lineNumber)
}

// Table keys act on tables, never on pipe-led lines inside code.
function outsideCode(command: Command): Command {
  return (v) => !inCodeBlock(v.state.doc.toString(), v.state.doc.lineAt(v.state.selection.main.head).number) && command(v)
}

// A content-less marker as the continuation writes it: `- `, `- [ ] `, `2. `, `b) `.
const BARE_LIST_MARKER = /^(?:[-*] [ \t]*(?:\[[ xX_>?-]\] [ \t]*)?|(?:\.|(?:[0-9]+|[A-Za-z]|[ivxlcdm]+|[IVXLCDM]+)[.)]) [ \t]*)$/
// Checked task boxes too, plus the server's own set, which adds a bare description `: `.
const BARE_MARKER = { test: (rest: string) => BARE_LIST_MARKER.test(rest) || BARE_CONTINUATION_MARKER.test(rest) }

// Backspace at the end of an empty item removes the whole marker, keeping the
// indent and any quote prefix, instead of one separator space at a time.
const deleteBareMarker: Command = (v) => {
  const sel = v.state.selection
  if (sel.ranges.length !== 1 || !sel.main.empty) return false
  const line = v.state.doc.lineAt(sel.main.head)
  if (sel.main.head !== line.to) return false
  const lead = /^(?:[ \t]*> ?)*[ \t]*/.exec(line.text)![0]
  const rest = line.text.slice(lead.length)
  if (!rest || !BARE_MARKER.test(rest) || inCodeBlock(v.state.doc.toString(), line.number)) return false
  v.dispatch({ changes: { from: line.from + lead.length, to: line.to }, userEvent: 'delete.backward' })
  return true
}

// A continuation leaves `- ` on the new line, which Carve reads as text, so the
// preview would show a stray marker until the item gets content. Render without it.
let lastPreview: string | null = null
function emitPreview(state: EditorState): void {
  let preview: string | null = null
  const sel = state.selection
  if (sel.ranges.length === 1 && sel.main.empty) {
    const line = state.doc.lineAt(sel.main.head)
    const lead = /^(?:[ \t]*> ?)*[ \t]*/.exec(line.text)![0]
    const rest = line.text.slice(lead.length)
    if (sel.main.head === line.to && rest && BARE_MARKER.test(rest) && !inCodeBlock(state.doc.toString(), line.number)) {
      preview = state.doc.sliceString(0, line.from + lead.length).replace(/[ \t]+$/, '') + state.doc.sliceString(line.to)
    } else if ((/^[ \t]*\|[ \t]*$/.test(line.text) || isBlankRow(line.text)) && rowBelowTable(state, line.number)) {
      // A row being filled under a table renders as stray text until it has content.
      preview = state.doc.sliceString(0, line.from) + state.doc.sliceString(line.to + 1)
    }
  }
  if (preview === lastPreview) return
  lastPreview = preview
  emit('preview', preview)
}

// Outside lists and tables, indenting a line's start can turn a heading, quote
// or table row into text, so only code blocks indent; elsewhere Tab inserts
// two spaces mid-line and does nothing at the start of the line's text.
const plainTab: Command = (v) => {
  const head = v.state.selection.main.head
  const line = v.state.doc.lineAt(head)
  if (inCodeBlock(v.state.doc.toString(), line.number)) return indentMore(v)
  if (!v.state.selection.main.empty || /^[ \t]*$/.test(line.text.slice(0, head - line.from))) return true
  v.dispatch(v.state.replaceSelection('  '), { userEvent: 'input' })
  return true
}
const plainShiftTab: Command = (v) => {
  const line = v.state.doc.lineAt(v.state.selection.main.head)
  return inCodeBlock(v.state.doc.toString(), line.number) ? indentLess(v) : true
}

function listIndent(direction: 'indent' | 'outdent', fallback: Command): Command {
  return (v) => {
    const sel = v.state.selection
    if (sel.ranges.length === 1) {
      const line = v.state.doc.lineAt(sel.main.head)
      const text = v.state.doc.toString()
      const edits = listIndentEdits(text, line.number - 1, direction)
      if (edits && edits.length) {
        applyEdits(v, edits)
        return true
      }
      // A list item with nothing to nest under (or out of) stays put rather than
      // taking a plain indent that would turn it into lazy text of the item above.
      if (listItems(text)?.starts.has(line.number - 1) || bareMarkerItem(text, line.number - 1, line.text)) return true
    }
    return fallback(v)
  }
}

const theme = EditorView.theme({
  // Line numbers sit outside the box: border and fill start at the gutter's edge.
  '&': {
    height: '100%',
    fontSize: '0.85rem',
    color: 'var(--vp-c-text-1)',
    background: 'linear-gradient(to right, transparent var(--carve-gutter-w, 0px), var(--vp-c-bg-soft) var(--carve-gutter-w, 0px))',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: '0 0 0 var(--carve-gutter-w, 0px)',
    border: '1px solid var(--vp-c-divider)',
    borderRadius: '8px',
    pointerEvents: 'none',
  },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused::after': { borderColor: 'var(--vp-c-brand-1)' },
  '.cm-scroller': {
    fontFamily: 'var(--vp-font-family-mono, ui-monospace, monospace)',
    lineHeight: '1.5',
    scrollBehavior: 'auto',
  },
  '.cm-content': { padding: '0.75rem 0', caretColor: 'var(--vp-c-text-1)' },
  '.cm-line': { padding: '0 0.75rem' },
  '.cm-gutters': {
    background: 'var(--vp-c-bg)',
    border: 'none',
    color: 'var(--vp-c-text-3)',
    opacity: '0.55',
    fontSize: '0.75rem',
  },
  '.cm-gutter.cm-lineNumbers .cm-gutterElement': { padding: '0 0.5rem 0 0' },
  '.cm-activeLine': { background: 'var(--vp-c-default-soft)' },
  '.cm-activeLineGutter': { background: 'transparent', color: 'var(--vp-c-text-2)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    background: 'var(--vp-c-brand-soft) !important',
  },
  '.cm-cursor': { borderLeftColor: 'var(--vp-c-text-1)' },
})

// The gutter grows with the line count (99 -> 100); the box and the left pull follow it.
function syncGutterWidth(v: EditorView): void {
  const width = (v.dom.querySelector('.cm-gutters') as HTMLElement | null)?.offsetWidth ?? 0
  host.value?.style.setProperty('--carve-gutter-w', `${width}px`)
}

onMounted(() => {
  if (!host.value) return
  view.value = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          { key: 'Enter', run: continueOnEnter },
          { key: 'Backspace', run: deleteBareMarker },
          // In a table, Tab and Shift+Tab align it and move between cells.
          { key: 'Tab', run: (v) => outsideCode(nextCell)(v) || listIndent('indent', plainTab)(v) },
          { key: 'Shift-Tab', run: (v) => outsideCode(previousCell)(v) || listIndent('outdent', plainShiftTab)(v) },
          { key: 'Mod-Alt-f', run: outsideCode(formatTable) },
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
        ]),
        wrapping.of(props.wrap ? EditorView.lineWrapping : []),
        EditorView.contentAttributes.of({ spellcheck: 'false', 'aria-label': 'Carve source' }),
        tokenField,
        theme,
        carveDiagnostics,
        carveCompletion,
        carveHover,
        carveLanguageTheme,
        carveTooltips,
        EditorView.updateListener.of((u) => {
          if (u.geometryChanged) syncGutterWidth(u.view)
          if (u.selectionSet) revealLineStart(u.view)
          if (u.docChanged || u.selectionSet) {
            emitPreview(u.state)
            emit('cursor', u.state.doc.lineAt(u.state.selection.main.head).number)
          }
          if (!u.docChanged) return
          emit('update:modelValue', u.state.doc.toString())
          scheduleHighlight()
        }),
      ],
    }),
  })
  scheduleHighlight(0)
  syncGutterWidth(view.value)
  emitPreview(view.value.state)
})

onBeforeUnmount(() => {
  clearTimeout(highlightTimer)
  view.value?.destroy()
})

// External writes (share link, Markdown import) replace the document.
watch(
  () => props.modelValue,
  (value) => {
    const v = view.value
    if (!v || v.state.doc.toString() === value) return
    v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
  },
)
watch(
  () => props.wrap,
  (on) => view.value?.dispatch({ effects: wrapping.reconfigure(on ? EditorView.lineWrapping : []) }),
)

// With wrapping off, a cursor near the start of its line scrolls fully left
// instead of stopping where it is just visible, so the line's marker or `|`
// stays in view after Enter on a long row.
function revealLineStart(v: EditorView): void {
  v.requestMeasure({
    read(view) {
      const scroller = view.scrollDOM
      if (scroller.scrollLeft === 0) return null
      const head = view.state.selection.main.head
      const cursor = view.coordsAtPos(head)
      const start = view.coordsAtPos(view.state.doc.lineAt(head).from)
      if (!cursor || !start) return null
      const gutter = (view.dom.querySelector('.cm-gutters') as HTMLElement | null)?.offsetWidth ?? 0
      const visible = scroller.clientWidth - gutter - 24
      return cursor.left - start.left <= visible ? 0 : null
    },
    write(left, view) {
      if (left !== null) view.scrollDOM.scrollLeft = left
    },
  })
}

// Offset of the document's top inside the scroller's content, for line geometry.
function documentOffset(v: EditorView): number {
  return v.documentTop - v.scrollDOM.getBoundingClientRect().top + v.scrollDOM.scrollTop
}

defineExpose({
  focus: () => view.value?.focus(),
  scroller: () => view.value?.scrollDOM ?? null,
  // Fractional 1-based source line at the top of the visible area.
  topLine(): number {
    const v = view.value
    if (!v) return 1
    const y = v.scrollDOM.scrollTop - documentOffset(v)
    const block = v.lineBlockAtHeight(Math.max(0, y))
    const line = v.state.doc.lineAt(block.from).number
    return line + Math.min(1, Math.max(0, (y - block.top) / Math.max(1, block.height)))
  },
  // Scroll offset that puts fractional 1-based `line` at the top.
  lineOffset(line: number): number {
    const v = view.value
    if (!v) return 0
    const doc = v.state.doc
    const whole = Math.min(Math.max(1, Math.floor(line)), doc.lines)
    const block = v.lineBlockAt(doc.line(whole).from)
    return documentOffset(v) + block.top + (line - whole) * block.height
  },
})
</script>

<template>
  <div ref="host" class="carve-editor" />
</template>

<style>
.carve-editor {
  flex: 1;
  min-height: 0;
}
/* Pull the line numbers into the page margin only where there is one. */
@media (min-width: 960px) {
  .carve-editor {
    margin-left: calc(-1 * var(--carve-gutter-w, 0px));
  }
}
.dark .carve-editor .cm-content span[style*='--shiki-dark'] {
  color: var(--shiki-dark) !important;
  font-style: var(--shiki-dark-font-style, inherit) !important;
  font-weight: var(--shiki-dark-font-weight, inherit) !important;
}
.carve-editor .cm-carve-diff-add {
  color: #22863a;
  background-color: rgba(46, 160, 67, 0.16);
  font-weight: 700;
}
.carve-editor .cm-carve-diff-add span[style] {
  color: #22863a !important;
}
.carve-editor .cm-carve-diff-remove {
  color: #b31d28;
  background-color: rgba(248, 81, 73, 0.16);
  font-weight: 700;
}
.carve-editor .cm-carve-diff-remove span[style] {
  color: #b31d28 !important;
}
.dark .carve-editor .cm-carve-diff-add {
  color: #85e89d;
}
.dark .carve-editor .cm-carve-diff-add span[style] {
  color: #85e89d !important;
}
.dark .carve-editor .cm-carve-diff-remove {
  color: #fdaeb7;
}
.dark .carve-editor .cm-carve-diff-remove span[style] {
  color: #fdaeb7 !important;
}
</style>
