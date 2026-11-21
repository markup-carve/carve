// The 0.2 engine supplies diagnostics. The existing language server supplies
// completion and hover until the 0.2 editor API provides those features.
import type { Text } from '@codemirror/state'
import { EditorView, hoverTooltip, tooltips, type Tooltip } from '@codemirror/view'
import { linter, type Diagnostic as LintDiagnostic } from '@codemirror/lint'
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { completionAt, hoverAt } from '@markup-carve/carve-lsp/browser'
import { lint } from '../../engine.js'

type Position = { line: number; character: number }

// The 0.2 linter reports UTF-8 byte offsets; CodeMirror uses UTF-16 offsets.
function utf16Offsets(source: string): number[] {
  const positions: number[] = []
  let bytes = 0
  let utf16 = 0
  for (const scalar of source) {
    const codePoint = scalar.codePointAt(0)!
    const width = codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4
    for (let index = 0; index < width; index++) positions[bytes + index] = utf16
    bytes += width
    utf16 += scalar.length
  }
  positions[bytes] = utf16
  return positions
}

// LSP positions are 0-based lines and UTF-16 columns, which are CodeMirror's offsets.
function toOffset(doc: Text, position: Position): number {
  const line = doc.line(Math.min(doc.lines, Math.max(1, position.line + 1)))
  return Math.min(line.to, line.from + Math.max(0, position.character))
}
function toPosition(doc: Text, offset: number): Position {
  const line = doc.lineAt(offset)
  return { line: line.number - 1, character: offset - line.from }
}

export const carveDiagnostics = linter(
  (view) => {
    const doc = view.state.doc
    try {
      const source = doc.toString()
      const offsets = utf16Offsets(source)
      const fromByte = (byteOffset: number): number => offsets[Math.max(0, Math.min(offsets.length - 1, byteOffset))] ?? doc.length
      return lint(source).map((d): LintDiagnostic => ({
        from: fromByte(d.range.startOffset),
        to: Math.max(fromByte(d.range.startOffset), fromByte(d.range.endOffset)),
        severity: d.severity === 'error' ? 'error' : d.severity === 'hint' ? 'hint' : 'warning',
        message: d.message,
        source: `carve 0.2 ${d.code}`,
      }))
    } catch {
      return []
    }
  },
  { delay: 400 },
)

const KIND_TYPE: Record<number, string> = { 14: 'keyword', 10: 'property', 18: 'variable', 22: 'class', 25: 'type' }

function carveCompletions(context: CompletionContext): CompletionResult | null {
  const doc = context.state.doc
  let items
  try {
    items = completionAt(doc.toString(), toPosition(doc, context.pos))
  } catch {
    return null
  }
  if (!items.length) return null
  let from = context.pos
  const options = items.map((item) => {
    const edit = item.textEdit && 'range' in item.textEdit ? item.textEdit : undefined
    if (edit) from = Math.min(from, toOffset(doc, edit.range.start))
    return {
      label: item.label,
      apply: edit?.newText ?? item.insertText ?? item.label,
      detail: item.detail,
      type: KIND_TYPE[item.kind ?? 0] ?? 'text',
    }
  })
  return { from, options, validFor: /^[\w:.#=-]*$/ }
}

export const carveCompletion = autocompletion({ override: [carveCompletions], icons: false })

// Hover text is short Markdown: paragraphs, **bold** and `code`.
function renderHover(markdown: string): HTMLElement {
  const box = document.createElement('div')
  box.className = 'cm-carve-hover'
  for (const block of markdown.split(/\n{2,}/)) {
    const p = document.createElement('p')
    const parts = block.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    for (const part of parts) {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
        const code = document.createElement('code')
        code.textContent = part.slice(1, -1)
        p.appendChild(code)
      } else if (part.startsWith('**') && part.endsWith('**') && part.length > 3) {
        const strong = document.createElement('strong')
        strong.textContent = part.slice(2, -2)
        p.appendChild(strong)
      } else if (part) {
        p.appendChild(document.createTextNode(part))
      }
    }
    box.appendChild(p)
  }
  return box
}

function hoverText(contents: unknown): string {
  if (typeof contents === 'string') return contents
  if (Array.isArray(contents)) return contents.map(hoverText).join('\n\n')
  if (contents && typeof contents === 'object' && 'value' in contents) return String((contents as { value: unknown }).value)
  return ''
}

export const carveHover = hoverTooltip((view, pos): Tooltip | null => {
  const doc = view.state.doc
  let hover
  try {
    hover = hoverAt(doc.toString(), toPosition(doc, pos))
  } catch {
    return null
  }
  const text = hover ? hoverText(hover.contents) : ''
  if (!hover || !text) return null
  return {
    pos: hover.range ? toOffset(doc, hover.range.start) : pos,
    end: hover.range ? toOffset(doc, hover.range.end) : pos,
    above: true,
    create: () => ({ dom: renderHover(text) }),
  }
})

// On the body, so a tooltip near the pane edge is not clipped by the editor box.
export const carveTooltips = tooltips({ parent: typeof document === 'undefined' ? undefined : document.body })

export const carveLanguageTheme = EditorView.theme({
  '.cm-tooltip': {
    border: '1px solid var(--vp-c-divider)',
    borderRadius: '6px',
    background: 'var(--vp-c-bg)',
    color: 'var(--vp-c-text-1)',
    fontSize: '0.8rem',
    maxWidth: '28rem',
  },
  '.cm-carve-hover': { padding: '0.4rem 0.6rem' },
  '.cm-carve-hover p': { margin: '0.2rem 0' },
  '.cm-carve-hover code': { whiteSpace: 'nowrap', background: 'var(--vp-c-default-soft)', padding: '0 0.25rem', borderRadius: '3px' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { background: 'var(--vp-c-brand-soft)', color: 'var(--vp-c-text-1)' },
  '.cm-completionDetail': { color: 'var(--vp-c-text-3)', marginLeft: '0.6rem', fontStyle: 'normal' },
  '.cm-diagnostic': { padding: '0.3rem 0.6rem' },
})
