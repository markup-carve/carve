<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount, nextTick, defineAsyncComponent } from 'vue'
import { withBase } from 'vitepress'
import { diffCodeTransformer } from '../../diff-transformer.js'
// @ts-expect-error - local ESM helper without TS resolution context
import { PLAYGROUND_CODE_LANGUAGES, playgroundDataGrammars } from '../../playground-code-languages.js'
// @ts-expect-error - local ESM helper without TS resolution context
import { renderMathIn } from '../../render-math.js'
// @ts-expect-error - local ESM helper without TS resolution context
import { encodeShare, decodeShare } from '../../share-link.js'
import { render, parse, lint, format, fix, fixEdits } from '../../engine.js'
import { applyByteEdits, byteToUtf16, type ByteEdit } from '../editor/offsets'
import { isDiffPre } from '../../diff-fences.js'
// @ts-expect-error - local ESM helper without TS resolution context
import { ansiToHtml } from '../../ansi-html.js'
// @ts-expect-error - local ESM helper without TS resolution context
import { diffLines, foldDiff } from '../../line-diff.js'
import { source as DEFAULT_SOURCE } from '../../examples/demo.crv'
// @ts-expect-error - local ESM helper without TS resolution context
import { SNIPPETS } from '../../examples/snippets.js'

type Profile = 'full' | 'article' | 'comment' | 'minimal'
type HeadingIds = 'off' | 'keep-case' | 'lower' | 'ascii' | 'ascii-lower' | 'ascii-strict' | 'ascii-strict-lower'
type Output = 'html' | 'tree' | 'lint' | 'fmt' | 'markdown' | 'plain' | 'ansi'
type ExportTarget = 'markdown' | 'plain' | 'ansi'
const exportTargets: ExportTarget[] = ['markdown', 'plain', 'ansi']
type SharedOptions = { profile: Profile; headingIds: HeadingIds; sections: boolean; smartTypography: boolean; rawHtml: boolean }
const profileValues: Profile[] = ['full', 'article', 'comment', 'minimal']
const headingValues: HeadingIds[] = ['off', 'keep-case', 'lower', 'ascii', 'ascii-lower', 'ascii-strict', 'ascii-strict-lower']
const PHP_SANDBOX_URL = 'https://sandbox.dereuromark.de/sandbox/carve'
const source = ref(DEFAULT_SOURCE)
const fullscreen = ref(false)
const wrapLines = ref(false)
const WRAP_KEY = 'carve-playground-wrap'
const alignTables = ref(true)
const formatNote = ref('')
const fromSharedLink = ref(false)
const profile = ref<Profile>('full')
const headingIds = ref<HeadingIds>('keep-case')
const sections = ref(true)
const smartTypography = ref(true)
const rawHtmlEnabled = ref(false)
const optionsOpen = ref(false)
const output = ref<Output>('html')
const outputTabs: { id: Output; label: string }[] = [
  { id: 'html', label: 'HTML source' },
  { id: 'tree', label: 'Tree JSON' },
  { id: 'lint', label: 'Lint' },
  { id: 'fmt', label: 'Formatted source' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'plain', label: 'Plain text' },
  { id: 'ansi', label: 'ANSI' },
]
const options = computed<SharedOptions>(() => ({
  profile: profile.value, headingIds: headingIds.value, sections: sections.value,
  smartTypography: smartTypography.value, rawHtml: rawHtmlEnabled.value && !fromSharedLink.value,
}))
function safeValue<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback
}
const shareState = ref<'idle' | 'copied' | 'error'>('idle')
const shareMessage = ref('')
let shareStatusTimer: ReturnType<typeof setTimeout> | undefined
const shareTitle = computed(() => shareState.value === 'idle' ? 'Copy a link to this document' : shareMessage.value)
function flashShareStatus(state: 'copied' | 'error', message: string): void {
  shareState.value = state
  shareMessage.value = message
  clearTimeout(shareStatusTimer)
  shareStatusTimer = setTimeout(() => { shareState.value = 'idle'; shareMessage.value = '' }, 2500)
}
// The draft keeps the shared flag, so a document that came from a link keeps raw HTML off after a reload.
const DRAFT_KEY = 'carve-playground-draft'
let draftReady = false
let draftTimer: ReturnType<typeof setTimeout> | undefined
function readDraft(): { source: string; shared: boolean } | null {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null')
    if (!draft || typeof draft !== 'object' || typeof draft.source !== 'string') return null
    return { source: draft.source, shared: draft.shared !== false }
  } catch {
    return null
  }
}
function saveDraft(): void {
  if (!draftReady) return
  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, source: source.value, shared: fromSharedLink.value })) }
    catch { /* Storage blocked or full: the draft is not kept. */ }
  }, 400)
}
watch([source, fromSharedLink], saveDraft)
// A share link in the URL wins over the saved draft.
async function restoreState(): Promise<void> {
  if (await applyShareLink()) return
  const draft = readDraft()
  if (!draft || draft.source === source.value) return
  fromSharedLink.value = draft.shared
  rawHtmlEnabled.value = false
  formattedText = draft.source
  source.value = draft.source
  formatNote.value = 'draft restored'
}
function resetToDemo(): void {
  clearTimeout(draftTimer)
  draftReady = false
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* nothing stored */ }
  // A reload, not an edit: undo could otherwise bring a shared document back into an untainted session.
  window.location.replace(`${window.location.pathname}${window.location.search}`)
}
async function applyShareLink(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const state = await decodeShare(window.location.hash)
  if (!state) return false
  fromSharedLink.value = true
  source.value = state.source
  const saved = state.options ?? {}
  profile.value = safeValue(saved.profile, profileValues, 'full')
  headingIds.value = safeValue(saved.headingIds, headingValues, 'keep-case')
  sections.value = saved.sections === undefined ? true : saved.sections === true
  smartTypography.value = saved.smartTypography === undefined ? true : saved.smartTypography === true
  rawHtmlEnabled.value = false
  output.value = safeValue(state.output, outputTabs.map(tab => tab.id), 'html')
  return true
}
async function copyShareLink(): Promise<void> {
  const encoded = await encodeShare({ source: source.value, options: options.value, output: output.value })
  if (!encoded) { flashShareStatus('error', 'Too long to share as a link'); return }
  const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${encoded}`
  window.history.replaceState(null, '', url)
  try { await navigator.clipboard.writeText(url); flashShareStatus('copied', 'Link copied') }
  catch { flashShareStatus('copied', 'Link is in the address bar') }
}
let formattedText: string | null = null
function formatSource(): void {
  const before = source.value
  try {
    const next = format(before, { alignTables: alignTables.value })
    formattedText = next
    editorRef.value?.replaceAll(next)
    source.value = next
    formatNote.value = next === before ? 'already formatted' : 'formatted'
  } catch (error) {
    formatNote.value = `format failed: ${error instanceof Error ? error.message : String(error)}`
  }
}
watch(source, value => { if (value !== formattedText) formatNote.value = '' })
// The upgrade, import and export entries hold the 0.1 reader and the Markdown and Djot libraries, so they load on first use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tools = any
const tools = shallowRef<Tools | null>(null)
let toolsLoading: Promise<Tools> | null = null
function loadTools(): Promise<Tools> {
  toolsLoading ??= import('../../engine-tools.js').then((module) => (tools.value = module))
  return toolsLoading
}
async function upgradeSource(): Promise<void> {
  const before = source.value
  formatNote.value = 'upgrading...'
  try {
    const { upgrade } = await loadTools()
    const result = upgrade(before, { edits: true })
    if (result.output === before) { formatNote.value = 'already 0.2'; return }
    formattedText = result.output
    editorRef.value?.replaceAll(result.output)
    source.value = result.output
    const count = result.edits?.length ?? 1
    const changes = `${count} ${count === 1 ? 'change' : 'changes'}`
    formatNote.value = result.check === 'mismatch' ? `upgraded: ${changes}, renders differently, review it` : `upgraded: ${changes}`
  } catch (error) {
    formatNote.value = `upgrade failed: ${error instanceof Error ? error.message : String(error)}`
  }
}
type ImportFormat = 'markdown' | 'gfm' | 'djot' | 'bbcode' | 'html'
const importFormats: { id: ImportFormat; label: string }[] = [
  { id: 'markdown', label: 'Markdown (CommonMark)' },
  { id: 'gfm', label: 'GitHub Flavored Markdown' },
  { id: 'djot', label: 'Djot' },
  { id: 'bbcode', label: 'BBCode' },
  { id: 'html', label: 'HTML' },
]
type ImportDiagnostic = { code: string; severity: string; message: string }
const importOpen = ref(false)
const importText = ref('')
const importFormat = ref<ImportFormat>('gfm')
const importResult = ref<{ source: string; diagnostics: ImportDiagnostic[] } | null>(null)
const importError = ref('')
const importConfirm = ref(false)
const importInput = ref<HTMLTextAreaElement | null>(null)
const importButton = ref<HTMLButtonElement | null>(null)
function openImport(): void {
  importOpen.value = true
  importConfirm.value = false
  void loadTools()
  void nextTick(() => importInput.value?.focus())
}
function closeImport(): void {
  importOpen.value = false
  importConfirm.value = false
  void nextTick(() => importButton.value?.focus())
}
watch([importText, importFormat], () => { importResult.value = null; importError.value = ''; importConfirm.value = false })
async function convertImport(): Promise<void> {
  importError.value = ''
  importConfirm.value = false
  try {
    const { importDocument } = await loadTools()
    const result = importDocument(importText.value, { from: importFormat.value })
    importResult.value = { source: result.source, diagnostics: [...(result.diagnostics ?? [])] }
  } catch (error) {
    importResult.value = null
    importError.value = error instanceof Error ? error.message : String(error)
  }
}
function applyImport(): void {
  if (!importResult.value) return
  replaceSource(importResult.value.source)
  const label = importFormats.find(f => f.id === importFormat.value)?.label ?? importFormat.value
  formatNote.value = `imported from ${label} (Ctrl+Z restores)`
  closeImport()
}
const exampleChoice = ref('')
function loadExample(id: string): void {
  exampleChoice.value = ''
  const snippet = (SNIPPETS as { id: string; label: string; source: string }[]).find(s => s.id === id)
  if (!snippet) return
  replaceSource(snippet.source)
  formatNote.value = `example: ${snippet.label} (Ctrl+Z restores)`
}
// One undo step; the fragment goes too, so the address bar no longer offers the old document.
function clearSource(): void {
  editorRef.value?.replaceAll('')
  source.value = ''
  formattedText = ''
  if (typeof window !== 'undefined' && window.location.hash) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  }
  shareState.value = 'idle'
  shareMessage.value = ''
  formatNote.value = 'cleared (Ctrl+Z restores)'
  editorRef.value?.focus()
}

const outputEl = ref<HTMLElement | null>(null)
// Async so CodeMirror (~100 KB gzip) loads only on the playground page, not with
// the theme bundle every docs page shares.
const CarveEditor = defineAsyncComponent(() => import('./CarveEditor.vue'))
// What the editor wants rendered instead of `source` while the cursor sits on an empty list marker.
const previewSource = ref<string | null>(null)
const editorRef = ref<{
  focus: () => void
  replaceAll: (text: string) => void
  select: (from: number, to: number) => void
  scroller: () => HTMLElement | null
  topLine: () => number
  lineOffset: (line: number) => number
} | null>(null)
// The editor's scroll container stands in for the old textarea in scroll sync.
const sourceEl = computed<HTMLElement | null>(() => editorRef.value?.scroller() ?? null)

// Proportional scroll sync between the source and rendered panes.
//
// The guard cannot be a flag released one animation frame later: engines that
// dispatch `scroll` asynchronously, or that keep fractional scroll offsets, find
// it already released when the echo of our own write arrives, and the two panes
// then push each other indefinitely instead of settling. So remember the offset
// we wrote and ignore the event matching it, whichever frame it arrives in, and
// let only the pane the user is actually driving push the other one.
const expectedScroll = new WeakMap<HTMLElement, number>()
let scrollOwner: HTMLElement | null = null

function claimScroll(el: HTMLElement | null): void {
  if (el) scrollOwner = el
}

function setScrollTop(el: HTMLElement, top: number): void {
  const next = Math.max(0, Math.min(top, el.scrollHeight - el.clientHeight))
  if (Math.abs(el.scrollTop - next) < 1) {
    // A sub-pixel write still fires `scroll` in some engines, which is enough to
    // keep an echo loop alive on its own.
    return
  }
  expectedScroll.set(el, next)
  el.scrollTop = next
}

function isEcho(el: HTMLElement): boolean {
  const expected = expectedScroll.get(el)
  if (expected === undefined) return false
  // Consumed either way: a write whose echo never arrived (the engine coalesced
  // it, or a re-render clamped the offset) must not swallow a later real gesture
  // that happens to land on the same offset.
  expectedScroll.delete(el)

  return Math.abs(el.scrollTop - expected) < 1
}

function shouldSync(from: HTMLElement): boolean {
  if (isEcho(from)) return false

  return !scrollOwner || scrollOwner === from
}

function syncScroll(from: HTMLElement, to: HTMLElement): void {
  const range = from.scrollHeight - from.clientHeight
  const ratio = range > 0 ? from.scrollTop / range : 0
  setScrollTop(to, ratio * (to.scrollHeight - to.clientHeight))
}

// The preview's `data-source-line` blocks as (line, top) points in scroll
// coordinates, increasing in both, closed by an end-of-document sentinel. Null
// when the engine wrote no anchors, and the panes fall back to proportional sync.
type Anchor = { line: number; top: number }
function previewAnchors(output: HTMLElement): Anchor[] | null {
  const base = output.getBoundingClientRect().top - output.scrollTop
  const points: Anchor[] = []
  for (const el of output.querySelectorAll<HTMLElement>('[data-source-line]')) {
    const line = Number(el.dataset.sourceLine)
    const top = el.getBoundingClientRect().top - base
    const last = points[points.length - 1]
    if (Number.isFinite(line) && (!last || (line > last.line && top >= last.top))) points.push({ line, top })
  }
  if (!points.length) return null
  if (points[0].line > 1) points.unshift({ line: 1, top: 0 })
  const lines = source.value.split('\n').length + 1
  points.push({ line: Math.max(lines, points[points.length - 1].line + 1), top: Math.max(output.scrollHeight, points[points.length - 1].top) })
  return points
}
// Piecewise-linear map between the two axes of the anchor list.
function interpolate(points: Anchor[], value: number, from: 'line' | 'top', to: 'line' | 'top'): number {
  let i = 0
  while (i < points.length - 2 && points[i + 1][from] <= value) i++
  const a = points[i]
  const b = points[i + 1]
  const span = b[from] - a[from]
  const t = span > 0 ? Math.min(1, Math.max(0, (value - a[from]) / span)) : 0
  return a[to] + t * (b[to] - a[to])
}

function onSourceScroll(): void {
  const source = sourceEl.value
  const output = outputEl.value
  if (!source || !output || !shouldSync(source)) return
  const anchors = previewAnchors(output)
  const editor = editorRef.value
  if (!anchors || !editor || atEnd(source)) return syncScroll(source, output)
  setScrollTop(output, interpolate(anchors, editor.topLine(), 'line', 'top'))
}
// At either end of its range a pane maps to the other's end: the panes differ in
// height, so the top line alone would leave the last blocks out of view.
function atEnd(el: HTMLElement): boolean {
  return el.scrollTop <= 0 || el.scrollTop >= el.scrollHeight - el.clientHeight - 1
}

// After typing or moving the cursor, bring the block it is in into view in the
// preview, unless it is already visible. Kept apart from scroll sync so reading
// the preview while the cursor rests does not pull it back.
let followLine: number | null = null
function onCursor(line: number): void {
  followLine = line
  void nextTick(followCursor)
}
function followCursor(): void {
  const output = outputEl.value
  if (followLine === null || !output) return
  const anchors = previewAnchors(output)
  if (!anchors) return
  const y = interpolate(anchors, followLine, 'line', 'top')
  const margin = Math.min(48, output.clientHeight / 4)
  if (y >= output.scrollTop + margin && y <= output.scrollTop + output.clientHeight - margin) return
  setScrollTop(output, y - output.clientHeight / 3)
}
function onOutputScroll(): void {
  const source = sourceEl.value
  const output = outputEl.value
  if (!source || !output || !shouldSync(output)) return
  // A gesture in the preview supersedes a restore still pending from the last
  // re-render, so the reader is not pulled back to where they were before it.
  outputScrollRestorePending = false
  followLine = null
  const anchors = previewAnchors(output)
  const editor = editorRef.value
  if (!anchors || !editor || atEnd(output)) return syncScroll(output, source)
  setScrollTop(source, editor.lineOffset(interpolate(anchors, output.scrollTop, 'top', 'line')))
}

// `v-html` replaces the preview's children whenever the document changes, which
// resets its scroll offset to the top on every keystroke. Capture the offset
// before Vue patches the DOM and put it back after, and again after the
// post-processing steps that change the pane's height.
let outputScrollBeforeRender = 0
let outputScrollRestorePending = false
// Post-processing is asynchronous, so a pass can still be awaiting Mermaid or math
// when the next render starts. Only the pass belonging to the current render may
// restore, or clear the pending state it did not set.
let renderGeneration = 0

function restoreOutputScroll(): void {
  if (!outputScrollRestorePending || !outputEl.value) return
  setScrollTop(outputEl.value, outputScrollBeforeRender)
}

// Render result plus the wall-clock time the parse+render took, so the UI can
// surface how fast each engine is. `ms` is null while the result is a status
// placeholder (WASM still loading or failed) rather than a real render.
const rendered = computed<{ html: string; ms: number | null }>(() => {
  try {
    const started = performance.now()
    const html = render(previewSource.value ?? source.value, options.value)
    const ms = performance.now() - started
    return { html, ms }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { html: `<pre class="carve-playground-error">${escapeHtml(message)}</pre>`, ms: null }
  }
})
const html = computed(() => rendered.value.html)
const rawHtml = computed(() => html.value)
const tree = computed(() => {
  try { return JSON.stringify(parse(source.value, { headingIds: headingIds.value }), null, 2) }
  catch (error) { return error instanceof Error ? error.message : String(error) }
})
type LintDiagnostic = { code: string; severity: string; message: string; range: { startOffset: number; endOffset: number } }
type Finding = { diagnostic: LintDiagnostic; from: number; to: number; line: number; column: number; edits: ByteEdit[] | null }
const lintResult = computed<{ findings: Finding[]; error: string | null }>(() => {
  const text = source.value
  try {
    const toUtf16 = byteToUtf16(text)
    const findings = (lint(text) as LintDiagnostic[]).map((diagnostic): Finding => {
      const from = toUtf16(diagnostic.range.startOffset)
      const to = Math.max(from, toUtf16(diagnostic.range.endOffset))
      const lineStart = text.lastIndexOf('\n', from - 1) + 1
      const line = text.slice(0, lineStart).split('\n').length
      // Columns count characters, so an emoji is one column as a reader sees it.
      const column = Array.from(text.slice(lineStart, from)).length + 1
      let edits: ByteEdit[] | null = null
      try { edits = fixEdits(text, diagnostic) } catch { edits = null }
      return { diagnostic, from, to, line, column, edits }
    })
    return { findings, error: null }
  } catch (error) {
    return { findings: [], error: error instanceof Error ? error.message : String(error) }
  }
})
const fixableCount = computed(() => lintResult.value.findings.filter(f => f.edits?.length).length)
const findingsJson = computed(() => lintResult.value.error ?? JSON.stringify(lintResult.value.findings.map(f => f.diagnostic), null, 2))
const lintNote = ref('')
function selectFinding(finding: Finding): void {
  editorRef.value?.select(finding.from, finding.to)
}
function replaceSource(next: string): void {
  formattedText = next
  editorRef.value?.replaceAll(next)
  source.value = next
}
function fixFinding(finding: Finding): void {
  if (!finding.edits?.length) return
  replaceSource(applyByteEdits(source.value, finding.edits).text)
  lintNote.value = `fixed ${finding.diagnostic.code}`
}
// fix() applies what it can prove; findings it leaves get their own quick-fix edits, one undo step in all.
function fixAll(): void {
  const before = source.value
  try {
    let next = fix(before).output as string
    const leftover = (lint(next) as LintDiagnostic[]).flatMap((diagnostic) => {
      try { return fixEdits(next, diagnostic) ?? [] } catch { return [] }
    })
    if (leftover.length) next = applyByteEdits(next, leftover).text
    if (next === before) { lintNote.value = 'nothing to fix'; return }
    const remaining = lint(next).length
    replaceSource(next)
    lintNote.value = remaining ? `fixed, ${remaining} left` : 'fixed all'
  } catch (error) {
    lintNote.value = `fix failed: ${error instanceof Error ? error.message : String(error)}`
  }
}
watch(source, value => { if (value !== formattedText) lintNote.value = '' })
const formatResult = computed<{ text: string; error: boolean }>(() => {
  try { return { text: format(source.value, { alignTables: alignTables.value }), error: false } }
  catch (error) { return { text: error instanceof Error ? error.message : String(error), error: true } }
})
const formatted = computed(() => formatResult.value.text)
type DiffEntry = { kind: 'same' | 'add' | 'del'; text: string } | { kind: 'skip'; count: number }
const formatDiff = computed<{ entries: DiffEntry[]; added: number; removed: number } | null>(() => {
  if (output.value !== 'fmt' || formatResult.value.error) return null
  const entries = diffLines(source.value, formatResult.value.text) as DiffEntry[]
  const added = entries.filter(e => e.kind === 'add').length
  const removed = entries.filter(e => e.kind === 'del').length
  return { entries: foldDiff(entries, 3), added, removed }
})
const exported = computed<{ text: string; losses: number } | null>(() => {
  const target = output.value as ExportTarget
  if (!exportTargets.includes(target)) return null
  const entry = tools.value
  if (!entry) {
    void loadTools()
    return { text: 'Loading the export entry...', losses: 0 }
  }
  try {
    const result = entry.exportDocument(target, parse(source.value, { headingIds: headingIds.value }))
    return { text: result.output, losses: result.diagnostics?.length ?? 0 }
  } catch (error) {
    return { text: error instanceof Error ? error.message : String(error), losses: 0 }
  }
})
const OUTPUT_FILES: Record<Output, { name: string; type: string }> = {
  html: { name: 'document.html', type: 'text/html' },
  tree: { name: 'document.json', type: 'application/json' },
  lint: { name: 'lint.json', type: 'application/json' },
  fmt: { name: 'formatted.crv', type: 'text/plain' },
  markdown: { name: 'document.md', type: 'text/markdown' },
  plain: { name: 'document.txt', type: 'text/plain' },
  ansi: { name: 'document.ansi.txt', type: 'text/plain' },
}
const copied = ref<'source' | 'output' | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
// An export tab reads the tools entry, which may still be loading.
async function settledOutput(): Promise<string> {
  if (exportTargets.includes(output.value as ExportTarget)) {
    await loadTools()
    await nextTick()
  }
  return activeOutput.value
}
async function copyText(which: 'source' | 'output'): Promise<void> {
  try {
    await navigator.clipboard.writeText(which === 'source' ? source.value : await settledOutput())
    copied.value = which
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = null }, 1500)
  } catch {
    copied.value = null
  }
}
async function download(which: 'source' | 'output'): Promise<void> {
  const file = which === 'source' ? { name: 'document.crv', type: 'text/plain' } : OUTPUT_FILES[output.value]
  const blob = new Blob([which === 'source' ? source.value : await settledOutput()], { type: `${file.type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
const ansiHtml = computed(() => output.value === 'ansi' && exported.value ? ansiToHtml(exported.value.text) : '')
const activeOutput = computed(() => output.value === 'html' ? rawHtml.value : output.value === 'tree' ? tree.value : output.value === 'lint' ? findingsJson.value : exported.value ? exported.value.text : formatted.value)
const mounted = ref(false)
const renderStatus = computed(() => {
  const ms = mounted.value ? rendered.value.ms : null
  return ms === null ? 'JS' : `JS: ${ms < 1 ? ms.toFixed(3) : ms.toFixed(2)} ms`
})
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// --- Mermaid (Tier-3 extension): render fenced `mermaid` code blocks client-side. ---
let mermaidInit = false
let mermaidSeq = 0

async function renderMermaid(): Promise<void> {
  const root = outputEl.value
  if (typeof window === 'undefined' || !root) return
  // `pre.mermaid` is the real Mermaid extension's output (JS engine, extensions
  // on); `pre > code.language-mermaid` is the plain code block the Rust/WASM
  // engine emits (no extensions). Render both.
  const blocks = root.querySelectorAll<HTMLElement>(
    'pre.mermaid, pre > code.language-mermaid',
  )
  if (!blocks.length) return
  const mermaid = (await import('mermaid')).default
  const dark = document.documentElement.classList.contains('dark')
  // Re-initialize per render so a theme toggle is picked up.
  //
  // `loose` is what makes a diagram's click directives and HTML labels active,
  // and the rendered SVG goes in through innerHTML. That is fine for a diagram
  // this visitor typed and not fine for one that arrived in a link, so a
  // shared document renders under mermaid's own `strict` sanitizer instead.
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: fromSharedLink.value ? 'strict' : 'loose',
    theme: dark ? 'dark' : 'default',
  })
  mermaidInit = true
  for (const el of Array.from(blocks)) {
    const pre = el.tagName === 'PRE' ? el : el.parentElement
    if (!pre) continue
    const definition = el.textContent ?? ''
    try {
      const { svg } = await mermaid.render(`carve-mermaid-${mermaidSeq++}`, definition)
      const figure = document.createElement('div')
      figure.className = 'mermaid-rendered'
      figure.innerHTML = svg
      pre.replaceWith(figure)
    } catch {
      // Leave the original code block in place on a parse error.
    }
  }
}

// --- Chart (FencedRender `chart` json preset): render via Chart.js. ---
// The chart() preset emits a `div.chart` wrapping a
// `script[type=application/json]` config. Read that config, swap in a
// <canvas>, and draw it.
let chartSeq = 0
async function renderCharts(): Promise<void> {
  const root = outputEl.value
  if (typeof window === 'undefined' || !root) return
  const blocks = root.querySelectorAll<HTMLElement>('div.chart')
  if (!blocks.length) return
  const Chart = (await import('chart.js/auto')).default
  for (const el of Array.from(blocks)) {
    if (el.dataset.chartDone) continue
    const script = el.querySelector('script[type="application/json"]')
    if (!script) continue
    let config: unknown
    try {
      config = JSON.parse(script.textContent ?? '')
    } catch {
      continue // leave the raw block on invalid JSON
    }
    const canvas = document.createElement('canvas')
    canvas.id = `carve-chart-${chartSeq++}`
    el.replaceChildren(canvas)
    el.dataset.chartDone = '1'
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Chart(canvas, config as any)
    } catch {
      // leave the empty canvas on a bad config
    }
  }
}

// --- Spoiler (Tier-2): inline `:spoiler[…]` blurs, reveals on click/keyboard.
// Block `::: spoiler` is a native <details>, so it needs no JS. ---
function wireSpoilers(): void {
  const root = outputEl.value
  if (!root) return
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('span.spoiler'))) {
    if (el.dataset.spoilerWired) continue
    el.dataset.spoilerWired = '1'
    el.tabIndex = 0
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', 'Spoiler, activate to reveal')
    el.title = 'Click to reveal'
    const toggle = (): void => {
      const revealed = el.classList.toggle('revealed')
      el.title = revealed ? 'Click to hide' : 'Click to reveal'
    }
    el.addEventListener('click', toggle)
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggle()
      }
    })
  }
}

// --- Syntax highlighting: Shiki, lazy-loaded, dual-theme. ---
// The carve renderer emits plain `<code class="language-x">`; highlight it
// client-side so the Playground output matches the rest of the docs. Shiki is
// already bundled (VitePress uses it) and loaded lazily here so it costs
// nothing until the first render. Dual-theme output uses CSS variables, so
// VitePress's existing `.dark .shiki` styling switches light/dark with no
// re-highlight.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let highlighterPromise: Promise<any> | null = null
function getHighlighter(): Promise<unknown> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighter } = await import('shiki')
      // The playground and the docs use the same 0.2 TextMate grammar.
      const carveGrammar = { ...(await import('@markup-carve/carve-grammars/textmate/carve.tmLanguage.json')).default, name: 'carve', aliases: ['crv', 'Carve'] }
      const csvGrammar = (await import('@markup-carve/carve-grammars/textmate/csv.tmLanguage.json')).default
      const tsvGrammar = (await import('@markup-carve/carve-grammars/textmate/tsv.tmLanguage.json')).default
      // The same Carve theme rules the docs code blocks get from carveMarkdown().
      const { carveLightTheme, carveDarkTheme } = await import('@markup-carve/carve-grammars/shiki/themes')
      return createHighlighter({
        themes: [carveLightTheme, carveDarkTheme],
        langs: [...PLAYGROUND_CODE_LANGUAGES, carveGrammar as never, ...playgroundDataGrammars(csvGrammar, tsvGrammar) as never[]],
      })
    })()
  }
  return highlighterPromise
}

async function highlightCode(): Promise<void> {
  const root = outputEl.value
  if (typeof window === 'undefined' || !root) return
  const codes = [...root.querySelectorAll<HTMLElement>('pre > code[class*="language-"]')].filter(
    (c) => !c.classList.contains('language-mermaid'),
  )
  if (!codes.length) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hl = (await getHighlighter()) as any
  const { carveBlankLineTransformer } = await import('@markup-carve/carve-grammars/shiki/themes')
  const loaded: string[] = hl.getLoadedLanguages()
  for (const code of codes) {
    const pre = code.parentElement
    if (!pre) continue
    const cls = [...code.classList].find((c) => c.startsWith('language-'))
    const lang = cls ? cls.slice('language-'.length) : ''
    if (!loaded.includes(lang)) continue // unknown language: leave the plain block
    try {
      const isLanguageDiff = isDiffPre(pre)
      const out = hl.codeToHtml(code.textContent ?? '', {
        lang,
        themes: { light: 'github-light', dark: 'github-dark' },
        transformers: [
          ...(isLanguageDiff ? [diffCodeTransformer()] : []),
          ...(['carve', 'crv'].includes(lang.toLowerCase()) ? [carveBlankLineTransformer] : []),
        ],
      }) as string
      const tmp = document.createElement('div')
      tmp.innerHTML = out
      const shikiPre = tmp.firstElementChild
      if (shikiPre instanceof HTMLElement) {
        shikiPre.dataset.lang = lang
        // Keep the block's scroll anchor on the highlighted replacement.
        if (pre.dataset.sourceLine) shikiPre.dataset.sourceLine = pre.dataset.sourceLine
        pre.replaceWith(shikiPre)
      }
    } catch {
      // Leave the original code block in place on a highlight error.
    }
  }
}

function codePillIcon(kind: 'copy' | 'check'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.classList.add('code-pill-icon')
  const paths = kind === 'copy'
    ? [
        'M8 8h10v12H8z',
        'M6 16H4V4h12v2',
      ]
    : [
        'M20 6 9 17l-5-5',
      ]
  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
  }
  return svg
}

// --- Code-block chrome: on hover, show the language and a click-to-copy icon.
// Runs after highlight so it covers Shiki blocks (tagged with data-lang) and
// any plain `language-x` block left un-highlighted. ---
function decorateCodeBlocks(): void {
  const root = outputEl.value
  if (!root) return
  for (const pre of Array.from(root.querySelectorAll<HTMLElement>('pre'))) {
    if (pre.dataset.pill) continue
    const code = pre.querySelector('code')
    let lang = pre.dataset.lang ?? ''
    if (!lang && code) {
      const cls = [...code.classList].find((c) => c.startsWith('language-'))
      lang = cls ? cls.slice('language-'.length) : ''
    }
    if (!lang || lang === 'mermaid') continue
    pre.dataset.pill = '1'
    const pill = document.createElement('div')
    pill.className = 'code-pill'
    const label = document.createElement('span')
    label.className = 'code-pill-lang'
    label.textContent = lang
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-pill-copy'
    btn.setAttribute('aria-label', 'Copy code')
    btn.title = 'Copy code'
    btn.replaceChildren(codePillIcon('copy'))
    btn.addEventListener('click', () => {
      const text = (code ?? pre).textContent ?? ''
      void navigator.clipboard?.writeText(text).then(() => {
        btn.replaceChildren(codePillIcon('check'))
        setTimeout(() => {
          btn.replaceChildren(codePillIcon('copy'))
        }, 1200)
      })
    })
    pill.append(label, btn)
    pre.appendChild(pill)
  }
}

// Mermaid first (it replaces blocks), then highlight code, then render math.
function resolveImagePaths(): void {
  for (const image of outputEl.value?.querySelectorAll<HTMLImageElement>('img[src^="images/"]') ?? []) {
    const source = image.getAttribute('src')!
    image.setAttribute('src', withBase(`/images/${source.slice('images/'.length)}`))
  }
}

async function postProcessOutput(): Promise<void> {
  const generation = renderGeneration
  resolveImagePaths()
  await renderMermaid()
  await renderCharts()
  wireSpoilers()
  await highlightCode()
  decorateCodeBlocks()
  await renderMathIn(outputEl.value)
  if (generation !== renderGeneration) return
  // Last, because every step above changes the pane's height.
  restoreOutputScroll()
  outputScrollRestorePending = false
  followCursor()
  followLine = null
}

let debounce: ReturnType<typeof setTimeout> | undefined
function schedulePostProcess(): void {
  if (typeof window === 'undefined') return
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    void nextTick(postProcessOutput)
  }, 200)
}

// Runs before Vue patches the DOM, so it reads the offset the reader is at.
watch(html, () => {
  renderGeneration++
  outputScrollBeforeRender = outputEl.value?.scrollTop ?? 0
  outputScrollRestorePending = true
  void nextTick(() => {
    restoreOutputScroll()
    followCursor()
  })
})
watch(html, schedulePostProcess)
onMounted(() => {
  mounted.value = true
  // Before the first post-process, so a shared document is what gets
  // highlighted, mermaid-rendered and math-rendered.
  void restoreState().then(() => {
    draftReady = true
    saveDraft()
    return nextTick(postProcessOutput)
  })
  window.addEventListener('keydown', onKeydown)
  try {
    wrapLines.value = localStorage.getItem(WRAP_KEY) === '1'
  } catch {
    // Storage blocked (private mode, sandboxed preview): keep the default.
  }
})
onBeforeUnmount(() => {
  clearTimeout(shareStatusTimer)
  clearTimeout(draftTimer)
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(debounce)
})

function toggleWrap(): void {
  wrapLines.value = !wrapLines.value
  try {
    localStorage.setItem(WRAP_KEY, wrapLines.value ? '1' : '0')
  } catch {
    // Not persisted; the toggle still applies to this visit.
  }
}

// --- Full screen ---
function toggleFullscreen(): void {
  fullscreen.value = !fullscreen.value
}
function onKeydown(e: KeyboardEvent): void {
  // The editor handled it already (closing a completion list or a lint tooltip).
  if (e.key !== 'Escape' || e.defaultPrevented) return
  if (importOpen.value) { closeImport(); return }
  if (fullscreen.value) fullscreen.value = false
}
// Avoid an "unused" warning while keeping the flag meaningful to tooling.
void mermaidInit
</script>

<template>
  <div class="carve-playground" :class="{ fullscreen }">
    <div class="pg-toolbar">
      <div class="pg-engines" role="group" aria-label="Rendering engine">
        <span class="pg-engines-label">Engine</span>
        <button class="pg-engine active" type="button" aria-pressed="true" title="Carve 0.2 JavaScript engine">JS</button>
        <button class="pg-engine" type="button" disabled title="Rust WASM is 0.1 only">Rust (WASM, 0.1 only)</button>
        <a
          class="pg-engine pg-engine-link"
          :href="PHP_SANDBOX_URL"
          target="_blank"
          rel="noopener"
          title="Open the PHP sandbox in a new tab"
        >
          PHP ↗
        </a>
      </div>
      <div class="pg-toolbar-right">
        <button
          class="pg-btn pg-icon-btn"
          type="button"
          :class="{ 'is-copied': shareState === 'copied', 'is-error': shareState === 'error' }"
          :title="shareTitle"
          aria-label="Copy a link to this document"
          @click="copyShareLink"
        >
          <svg
            v-if="shareState === 'idle'"
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.6" y1="10.7" x2="15.4" y2="6.3" />
            <line x1="8.6" y1="13.3" x2="15.4" y2="17.7" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline v-if="shareState === 'copied'" points="20 6 9 17 4 12" />
            <template v-else>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </template>
          </svg>
        </button>
        <span class="pg-sr-only" role="status" aria-live="polite">{{ shareMessage }}</span>
        <div class="pg-split" role="group" aria-label="Format">
          <button
            class="pg-btn"
            type="button"
            title="Format the source with the 0.2 writer (Ctrl+Z undoes it)"
            @click="formatSource"
          >
            Format
          </button>
          <button
            class="pg-btn pg-icon-btn"
            type="button"
            :class="{ active: alignTables }"
            :aria-pressed="alignTables"
            :title="alignTables ? 'Align tables when formatting: on' : 'Align tables when formatting: off'"
            aria-label="Align tables"
            @click="alignTables = !alignTables"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="1.5" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="9.5" y1="4" x2="9.5" y2="20" />
              <line x1="15" y1="4" x2="15" y2="20" />
            </svg>
          </button>
        </div>
        <select
          class="pg-btn pg-select"
          :value="exampleChoice"
          aria-label="Load an example"
          title="Replace the source with a short example (Ctrl+Z restores)"
          @change="loadExample(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>Examples</option>
          <option v-for="snippet in SNIPPETS" :key="snippet.id" :value="snippet.id">{{ snippet.label }}</option>
        </select>
        <button
          ref="importButton"
          class="pg-btn"
          type="button"
          title="Import Markdown, GFM, Djot, BBCode or HTML as Carve"
          aria-label="Import a document from another format"
          aria-haspopup="dialog"
          @click="openImport"
        >
          Import
        </button>
        <button
          class="pg-btn"
          type="button"
          title="Rewrite Carve 0.1 source as Carve 0.2 (Ctrl+Z undoes it)"
          aria-label="Upgrade 0.1 source to 0.2"
          @click="upgradeSource"
        >
          Upgrade 0.1
        </button>
        <button
          class="pg-btn"
          type="button"
          title="Empty the editor (Ctrl+Z restores)"
          aria-label="Clear the source"
          @click="clearSource"
        >
          Clear
        </button>
        <button
          class="pg-btn"
          type="button"
          title="Discard the saved draft and reload the demo document"
          aria-label="Reset to the demo document"
          @click="resetToDemo"
        >
          Reset to demo
        </button>
        <button class="pg-btn" type="button" :aria-expanded="optionsOpen" @click="optionsOpen = !optionsOpen">Options</button>
        <button
          class="pg-btn pg-icon-btn"
          type="button"
          :class="{ active: wrapLines }"
          :aria-pressed="wrapLines"
          :title="wrapLines ? 'Wrap long lines: on' : 'Wrap long lines: off (scroll horizontally)'"
          aria-label="Wrap long lines"
          @click="toggleWrap"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M3 12h15a3 3 0 0 1 0 6h-4" />
            <polyline points="16 16 14 18 16 20" />
            <line x1="3" y1="18" x2="10" y2="18" />
          </svg>
        </button>
        <button
          class="pg-btn pg-icon-btn"
          type="button"
          :class="{ active: fullscreen }"
          :aria-pressed="fullscreen"
          :title="fullscreen ? 'Exit full screen (Esc)' : 'Full screen'"
          aria-label="Full screen"
          @click="toggleFullscreen"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path v-if="!fullscreen" d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            <path v-else d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        </button>
      </div>
    </div>
    <fieldset v-if="optionsOpen" class="pg-options">
      <legend>Render options</legend>
      <label>Profile <select v-model="profile"><option v-for="value in profileValues" :key="value" :value="value">{{ value }}</option></select></label>
      <label>Heading IDs <select v-model="headingIds"><option v-for="value in headingValues" :key="value" :value="value">{{ value }}</option></select></label>
      <label><input v-model="sections" type="checkbox"> Sections</label>
      <label><input v-model="smartTypography" type="checkbox"> Smart typography</label>
      <label title="Shared documents always keep raw HTML off"><input v-model="rawHtmlEnabled" type="checkbox" :disabled="fromSharedLink"> Raw HTML</label>
    </fieldset>
    <div v-if="importOpen" class="pg-modal-backdrop" @click.self="closeImport">
      <div class="pg-modal" role="dialog" aria-modal="true" aria-labelledby="pg-import-title">
        <h2 id="pg-import-title" class="pg-modal-title">Import a document</h2>
        <label class="pg-modal-row">Format
          <select v-model="importFormat" aria-label="Input format">
            <option v-for="f in importFormats" :key="f.id" :value="f.id">{{ f.label }}</option>
          </select>
        </label>
        <label for="pg-import-text">Input</label>
        <textarea id="pg-import-text" ref="importInput" v-model="importText" spellcheck="false" placeholder="Paste the document here" />
        <p v-if="importError" class="pg-import-error" role="alert">{{ importError }}</p>
        <template v-if="importResult">
          <label for="pg-import-out">Carve result</label>
          <pre id="pg-import-out" class="pg-import-out" tabindex="0">{{ importResult.source || '(empty)' }}</pre>
          <ul v-if="importResult.diagnostics.length" class="pg-import-diags" aria-label="Import diagnostics">
            <li v-for="(d, i) in importResult.diagnostics" :key="i"><span class="pg-lint-sev">{{ d.severity }}</span> <code>{{ d.code }}</code> {{ d.message }}</li>
          </ul>
          <p v-else class="pg-import-clean">No import diagnostics.</p>
        </template>
        <div class="pg-modal-actions">
          <template v-if="importConfirm">
            <span class="pg-confirm-text" role="alert">Replace the current document? Ctrl+Z restores it.</span>
            <button class="pg-btn" type="button" @click="importConfirm = false">Back</button>
            <button class="pg-btn pg-btn-primary" type="button" @click="applyImport">Yes, replace</button>
          </template>
          <template v-else>
            <button class="pg-btn" type="button" @click="closeImport">Cancel</button>
            <button class="pg-btn" type="button" :disabled="!importText" @click="convertImport">Convert</button>
            <button class="pg-btn pg-btn-primary" type="button" :disabled="!importResult" @click="importConfirm = true">Replace document</button>
          </template>
        </div>
      </div>
    </div>
    <div class="pg-grid">
      <div class="pane">
        <div class="pane-label-row">
          <label>Carve source</label>
          <span v-if="formatNote" class="pg-shared-note" role="status">{{ formatNote }}</span>
          <span class="pg-pane-actions">
          <button
            class="pg-pane-btn"
            type="button"
            :aria-label="copied === 'source' ? 'Copied' : 'Copy the source'"
            :title="copied === 'source' ? 'Copied' : 'Copy the source'"
            @click="copyText('source')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline v-if="copied === 'source'" points="20 6 9 17 4 12" />
              <template v-else><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></template>
            </svg>
          </button>
          <button class="pg-pane-btn" type="button" :aria-label="'Download the source as document.crv'" :title="'Download the source as document.crv'" @click="download('source')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 4v11" /><polyline points="7 10 12 15 17 10" /><path d="M5 20h14" />
            </svg>
          </button>
          </span>
        </div>
        <div
          class="carve-editor-wrap"
          @pointerenter="claimScroll(sourceEl)"
          @wheel.passive="claimScroll(sourceEl)"
          @touchstart.passive="claimScroll(sourceEl)"
          @focusin="claimScroll(sourceEl)"
          @keydown="claimScroll(sourceEl)"
          @scroll.capture="onSourceScroll"
        >
          <ClientOnly>
            <CarveEditor
              ref="editorRef"
              v-model="source"
              :wrap="wrapLines"
              @preview="previewSource = $event"
              @cursor="onCursor"
              :get-highlighter="getHighlighter"
            />
          </ClientOnly>
        </div>
      </div>
      <div class="pane">
        <div class="pane-label-row">
          <label>Rendered HTML</label>
          <span
            v-if="fromSharedLink"
            class="pg-shared-note"
            role="note"
            title="Received links render with raw HTML off"
          >
            shared link: raw HTML off
          </span>
        </div>
        <div
          ref="outputEl"
          class="output carve carve-render"
          v-html="html"
          @pointerenter="claimScroll(outputEl)"
          @wheel.passive="claimScroll(outputEl)"
          @touchstart.passive="claimScroll(outputEl)"
          @scroll="onOutputScroll"
        />
      </div>
      <div class="pane pane-full">
        <div class="pane-label-row">
          <div class="pg-output-tabs" role="group" aria-label="Output type">
            <button v-for="tab in outputTabs" :key="tab.id" class="pg-output-tab" type="button" :aria-pressed="output === tab.id" @click="output = tab.id">{{ tab.label }}</button>
          </div>
          <span v-if="output === 'ansi'" class="pg-shared-note">escape codes shown as styles</span>
          <span v-if="exported?.losses" class="pg-shared-note" :title="`The ${output} export cannot spell ${exported.losses} construct(s)`">{{ exported.losses }} {{ exported.losses === 1 ? 'loss' : 'losses' }}</span>
          <span class="pg-status" aria-live="polite">{{ renderStatus }}</span>
          <span class="pg-pane-actions">
          <button
            class="pg-pane-btn"
            type="button"
            :aria-label="copied === 'output' ? 'Copied' : 'Copy this output'"
            :title="copied === 'output' ? 'Copied' : 'Copy this output'"
            @click="copyText('output')"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline v-if="copied === 'output'" points="20 6 9 17 4 12" />
              <template v-else><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></template>
            </svg>
          </button>
          <button class="pg-pane-btn" type="button" :aria-label="`Download as ${OUTPUT_FILES[output].name}`" :title="`Download as ${OUTPUT_FILES[output].name}`" @click="download('output')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 4v11" /><polyline points="7 10 12 15 17 10" /><path d="M5 20h14" />
            </svg>
          </button>
          </span>
        </div>
        <div v-if="output === 'lint'" class="raw pg-lint">
          <p v-if="lintResult.error" class="pg-lint-empty">{{ lintResult.error }}</p>
          <p v-else-if="!lintResult.findings.length" class="pg-lint-empty">No lint findings.</p>
          <template v-else>
            <div class="pg-lint-head">
              <span>{{ lintResult.findings.length }} {{ lintResult.findings.length === 1 ? 'finding' : 'findings' }}</span>
              <span v-if="lintNote" role="status">{{ lintNote }}</span>
              <button
                v-if="fixableCount"
                class="pg-btn pg-btn-small"
                type="button"
                :title="`Apply every available fix (${fixableCount}); Ctrl+Z undoes it`"
                aria-label="Fix all lint findings"
                @click="fixAll"
              >
                Fix all ({{ fixableCount }})
              </button>
            </div>
            <ul class="pg-lint-list">
              <li v-for="(finding, index) in lintResult.findings" :key="index" :class="`pg-sev-${finding.diagnostic.severity}`">
                <button
                  class="pg-lint-item"
                  type="button"
                  :title="`Select line ${finding.line}, column ${finding.column} in the editor`"
                  @click="selectFinding(finding)"
                >
                  <span class="pg-lint-sev">{{ finding.diagnostic.severity }}</span>
                  <code class="pg-lint-code">{{ finding.diagnostic.code }}</code>
                  <span class="pg-lint-msg">{{ finding.diagnostic.message }}</span>
                  <span class="pg-lint-pos">{{ finding.line }}:{{ finding.column }}</span>
                </button>
                <button
                  v-if="finding.edits?.length"
                  class="pg-btn pg-btn-small"
                  type="button"
                  :aria-label="`Fix ${finding.diagnostic.code} at ${finding.line}:${finding.column}`"
                  title="Apply this fix (Ctrl+Z undoes it)"
                  @click="fixFinding(finding)"
                >
                  Fix
                </button>
              </li>
            </ul>
          </template>
        </div>
        <div v-else-if="output === 'fmt' && formatDiff" class="raw pg-diff">
          <div class="pg-lint-head">
            <span v-if="formatDiff.added || formatDiff.removed">
              <span class="pg-diff-count-add">+{{ formatDiff.added }}</span> <span class="pg-diff-count-del">-{{ formatDiff.removed }}</span> lines against the current source
            </span>
            <span v-else-if="source === formatted">Already formatted.</span>
            <span v-else>Only the final newline differs.</span>
            <button
              v-if="source !== formatted"
              class="pg-btn pg-btn-small"
              type="button"
              title="Replace the source with the formatted source (Ctrl+Z undoes it)"
              aria-label="Apply the formatted source"
              @click="formatSource"
            >
              Apply
            </button>
          </div>
          <div v-if="formatDiff.added || formatDiff.removed" class="pg-diff-lines" role="table" aria-label="Changes the formatter makes">
            <template v-for="(entry, index) in formatDiff.entries" :key="index">
              <div v-if="entry.kind === 'skip'" class="pg-diff-skip" role="row"><span role="cell">... {{ entry.count }} unchanged {{ entry.count === 1 ? 'line' : 'lines' }}</span></div>
              <div v-else :class="`pg-diff-${entry.kind}`" role="row">
                <span class="pg-diff-sign" role="cell" :aria-label="entry.kind === 'add' ? 'added' : entry.kind === 'del' ? 'removed' : 'unchanged'">{{ entry.kind === 'add' ? '+' : entry.kind === 'del' ? '-' : ' ' }}</span>
                <span role="cell">{{ entry.text || ' ' }}</span>
              </div>
            </template>
          </div>
        </div>
        <pre v-else-if="output === 'ansi'" class="raw pg-ansi" aria-label="ANSI output, escape codes shown as styles" v-html="ansiHtml" />
        <pre v-else class="raw" aria-live="polite">{{ activeOutput }}</pre>
      </div>
    </div>


  </div>
</template>

<style scoped>
.carve-playground {
  margin: 1rem 0;
}
.pg-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-bottom: 0.6rem;
}
.pg-engines {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.pg-engines-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  margin-right: 0.2rem;
}
.pg-engine {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.pg-engine:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.pg-engine.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.pg-engine-link {
  color: var(--vp-c-text-2);
}
.pg-toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.pg-status {
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.pg-btn {
  font-size: 0.8rem;
  font-weight: 600;
  /* The toolbar is tight enough with four controls that a two-word label
     breaks across lines and doubles the row height. */
  white-space: nowrap;
  padding: 0.35rem 0.8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.pg-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
/* Share button: icon only, so the toolbar keeps the one-row layout it had
   before. It is square, and the success/failure states only recolor it - a
   state that changed the button's width would shift the whole row. */
.pg-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  padding: 0.35rem 0;
}
.carve-editor-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.pg-icon-btn.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.pg-icon-btn.is-copied {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.pg-icon-btn.is-error {
  border-color: var(--vp-c-danger-1, #d64550);
  color: var(--vp-c-danger-1, #d64550);
}
/* The icon carries the outcome visually; this carries it for a screen reader. */
.pg-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
/* Why the output is not what the sender saw, if their document used raw HTML.
   Stated rather than hidden: silence would read as a rendering bug. It sits in
   the rendered pane's label row, beside what it describes, because a sentence
   in the toolbar wraps the button row onto a second line. */
.pg-split {
  display: inline-flex;
}
.pg-split > .pg-btn:first-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.pg-split > .pg-btn:last-child {
  margin-left: -1px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
/* Every toolbar control shares one height, whatever its content. */
.pg-engine,
.pg-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  height: 2rem;
  line-height: 1;
}
.pg-shared-note {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.pg-engine:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.pg-engine:disabled:hover {
  border-color: var(--vp-c-divider);
  color: inherit;
}
.pg-btn-primary {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-white, #fff);
}
.pg-btn-primary:hover {
  background: var(--vp-c-brand-2);
  border-color: var(--vp-c-brand-2);
  color: var(--vp-c-white, #fff);
}
/* HTML-source pane header: label on the left, live render status on the
   right. Moving the status here frees the toolbar so Import Markdown fits
   beside the icon buttons. */
.pane-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}
.pg-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.45);
}
.pg-modal {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: min(640px, 100%);
  padding: 1.1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}
.pg-modal label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--vp-c-text-2);
}
.pg-modal textarea {
  width: 100%;
  min-height: 240px;
  padding: 0.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  resize: vertical;
}
.pg-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
.pg-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: minmax(280px, 45vh) minmax(180px, 30vh);
  gap: 1rem;
}
.pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
.pane-full {
  grid-column: 1 / -1;
}
.pane label {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
/* Scroll sync writes offsets directly. Smooth scrolling would turn every write
   into a multi-frame animation whose intermediate offsets echo back as if the
   reader had scrolled. */
textarea,
.output {
  scroll-behavior: auto;
}
textarea {
  flex: 1;
  font-family: var(--vp-font-family-mono, ui-monospace, monospace);
  font-size: 0.85rem;
  line-height: 1.5;
  padding: 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  resize: none;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  outline: none;
}
textarea:focus {
  border-color: var(--vp-c-brand-1);
}
.output {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: auto;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  line-height: 1.6;
}
.raw {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: auto;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono, ui-monospace, monospace);
  font-size: 0.78rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Full-screen mode: fill the viewport above the rest of the UI. */
.carve-playground.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 60;
  margin: 0;
  padding: 1rem 1.25rem 1.25rem;
  background: var(--vp-c-bg);
  display: flex;
  flex-direction: column;
}
/* No page margin to pull the line numbers into at the viewport edge. */
.carve-playground.fullscreen .carve-editor-wrap :deep(.carve-editor) {
  margin-left: 0;
}
.carve-playground.fullscreen .pg-grid {
  flex: 1;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) minmax(0, 28vh);
}

.carve-playground :deep(.output > *:first-child) {
  margin-top: 0;
}
.carve-playground :deep(.output > *:last-child) {
  margin-bottom: 0;
}
.carve-playground :deep(.carve-playground-error) {
  color: var(--vp-c-danger-1, #d73a49);
  background: var(--vp-c-bg-soft);
  padding: 0.5rem;
  border-radius: 4px;
}
.carve-playground :deep(.carve-playground-note) {
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  padding: 0.5rem;
  border-radius: 4px;
}
.carve-playground :deep(.mermaid-rendered) {
  margin: 1rem 0;
  text-align: center;
}
.carve-playground :deep(.mermaid-rendered svg) {
  max-width: 100%;
  height: auto;
}
@media (max-width: 768px) {
  .pg-grid {
    grid-template-columns: 1fr;
    grid-template-rows: 320px 320px 200px;
  }
  .pane-full {
    grid-column: 1;
  }
}

.pg-options { display: flex; flex-wrap: wrap; gap: .4rem 1rem; align-items: center; border: 1px solid var(--vp-c-divider); border-radius: 8px; margin: 0 0 .6rem; padding: .4rem .7rem .6rem; }
.pg-options legend { color: var(--vp-c-text-2); font-size: .75rem; font-weight: 600; }
.pg-options label { display: inline-flex; align-items: center; gap: .25rem; font-size: .8rem; }
.pg-options select { max-width: 10rem; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }
.pg-options input { margin: 0; }
.pg-modal-title { margin: 0; padding: 0; border: 0; font-size: 1.05rem; }
.pg-modal-row { display: flex; align-items: center; gap: .5rem; }
.pg-modal select { border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); padding: .2rem .4rem; }
.pg-modal textarea { min-height: 180px; }
.pg-import-out { max-height: 200px; overflow: auto; margin: 0; padding: .6rem; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg-soft); font-size: .78rem; white-space: pre-wrap; }
.pg-import-diags { max-height: 120px; overflow: auto; margin: 0; padding-left: 1rem; font-size: .78rem; }
.pg-import-clean, .pg-import-error { margin: 0; font-size: .8rem; color: var(--vp-c-text-2); }
.pg-import-error { color: var(--vp-c-danger-1, #d64550); }
.pg-confirm-text { margin-right: auto; align-self: center; font-size: .8rem; font-weight: 600; }
.pg-btn:disabled { opacity: .5; cursor: not-allowed; }
.pg-modal { max-height: calc(100vh - 2rem); overflow: auto; }
.pg-ansi { color: var(--vp-c-text-1); }
.pg-ansi :deep(.ansi-bold) { font-weight: 700; }
.pg-ansi :deep(.ansi-dim) { opacity: .7; }
.pg-ansi :deep(.ansi-italic) { font-style: italic; }
.pg-ansi :deep(.ansi-underline) { text-decoration: underline; }
.pg-ansi :deep(.ansi-strike) { text-decoration: line-through; }
.pg-ansi :deep(.ansi-inverse) { background: var(--vp-c-text-1); color: var(--vp-c-bg); }
.pg-ansi :deep(.ansi-fg-black) { color: #555; }
.pg-ansi :deep(.ansi-fg-red), .pg-ansi :deep(.ansi-fg-bright-red) { color: #d64550; }
.pg-ansi :deep(.ansi-fg-green), .pg-ansi :deep(.ansi-fg-bright-green) { color: #2f9e44; }
.pg-ansi :deep(.ansi-fg-yellow), .pg-ansi :deep(.ansi-fg-bright-yellow) { color: #b8860b; }
.pg-ansi :deep(.ansi-fg-blue), .pg-ansi :deep(.ansi-fg-bright-blue) { color: #3b6fd8; }
.pg-ansi :deep(.ansi-fg-magenta), .pg-ansi :deep(.ansi-fg-bright-magenta) { color: #b04ec9; }
.pg-ansi :deep(.ansi-fg-cyan), .pg-ansi :deep(.ansi-fg-bright-cyan) { color: #138a9e; }
.pg-ansi :deep(.ansi-fg-white), .pg-ansi :deep(.ansi-fg-bright-white), .pg-ansi :deep(.ansi-fg-bright-black) { color: var(--vp-c-text-2); }
.pg-ansi :deep([class*="ansi-bg-"]) { background: var(--vp-c-default-soft); }
.pg-select { appearance: auto; padding-right: .4rem; }
.pg-pane-actions { display: inline-flex; gap: .2rem; margin-left: auto; }
.pg-status + .pg-pane-actions { margin-left: 0; }
.pg-pane-btn { display: inline-flex; align-items: center; justify-content: center; width: 1.6rem; height: 1.6rem; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-2); cursor: pointer; }
.pg-pane-btn:hover, .pg-pane-btn:focus-visible { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.pg-diff { display: flex; flex-direction: column; gap: .4rem; }
.pg-diff-lines { display: flex; flex-direction: column; }
.pg-diff-lines > div { display: flex; gap: .5rem; white-space: pre-wrap; padding: 0 .3rem; }
.pg-diff-sign { flex: none; width: 1ch; user-select: none; }
.pg-diff-add { background: rgba(46, 160, 67, .16); color: var(--vp-c-text-1); }
.pg-diff-del { background: rgba(248, 81, 73, .16); color: var(--vp-c-text-1); }
.pg-diff-skip { color: var(--vp-c-text-3); font-style: italic; }
.pg-diff-count-add { color: #2f9e44; }
.pg-diff-count-del { color: #d64550; }
.pg-btn-small { height: 1.6rem; padding: 0 .55rem; font-size: .72rem; }
.pg-lint { display: flex; flex-direction: column; gap: .4rem; white-space: normal; }
.pg-lint-empty { margin: 0; }
.pg-lint-head { display: flex; align-items: center; gap: .75rem; font-family: var(--vp-font-family-base); font-weight: 600; }
.pg-lint-head > button { margin-left: auto; }
.pg-lint-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .2rem; }
.pg-lint-list li { display: flex; align-items: center; gap: .4rem; }
.pg-lint-item { flex: 1; display: grid; grid-template-columns: 4.5rem minmax(8rem, max-content) 1fr auto; gap: .6rem; align-items: baseline; min-width: 0; padding: .3rem .45rem; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--vp-c-text-1); font: inherit; text-align: left; cursor: pointer; }
.pg-lint-item:hover, .pg-lint-item:focus-visible { border-color: var(--vp-c-brand-1); background: var(--vp-c-bg); }
.pg-lint-sev { font-weight: 700; text-transform: uppercase; font-size: .68rem; }
.pg-sev-error .pg-lint-sev { color: var(--vp-c-danger-1, #d64550); }
.pg-sev-warning .pg-lint-sev { color: var(--vp-c-warning-1, #b8860b); }
.pg-sev-hint .pg-lint-sev, .pg-sev-info .pg-lint-sev { color: var(--vp-c-text-2); }
.pg-lint-code { font-size: .72rem; overflow-wrap: anywhere; }
.pg-lint-msg { min-width: 0; overflow-wrap: anywhere; }
.pg-lint-pos { font-variant-numeric: tabular-nums; color: var(--vp-c-text-2); }
@media (max-width: 640px) {
  .pg-lint-item { grid-template-columns: auto 1fr auto; }
  .pg-lint-msg { grid-column: 1 / -1; }
}
.pg-output-tabs { display: flex; flex-wrap: wrap; gap: .25rem; }
.pg-output-tab { padding: .18rem .4rem; border: 1px solid transparent; border-radius: 5px; background: transparent; color: var(--vp-c-text-2); font: 600 .72rem/1.2 var(--vp-font-family-base); cursor: pointer; }
.pg-output-tab[aria-pressed="true"] { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.pg-output-tab:hover { color: var(--vp-c-brand-1); }
</style>
