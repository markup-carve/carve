<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { withBase } from 'vitepress'
// @ts-expect-error - vendored ESM module without TS resolution context
import { carveToHtml } from '../../carve-lib/index.js'
// @ts-expect-error - local ESM helper without TS resolution context
import { carveExtensions } from '../../carve-extensions.js'
// @ts-expect-error - local ESM helper without TS resolution context
import { renderMathIn } from '../../render-math.js'

// Render the JS engine with every documented extension enabled, so the demo
// showcases the full feature set (real Mermaid extension, wikilinks, tabs,
// TOC, permalinks, citations, …). The Rust/WASM engine renders the extensions
// carve-rs ships (via its `toHtmlFull` binding) - most of the same set, minus
// a few JS-only extensions (tabs, code-group, heading-level-shift, …).
const JS_EXTENSIONS = carveExtensions()
// The canonical feature-demo document (also used by the VS Code extension),
// loaded as raw Carve source via vite-plugin-carve.
import { source as DEFAULT_SOURCE } from '../../examples/demo.crv'

// Hosted sandbox for the PHP reference implementation (carve-php). PHP cannot
// run in the browser, so this engine opens out to the sandbox instead of
// rendering in-page like the JS and Rust engines.
const PHP_SANDBOX_URL = 'https://sandbox.dereuromark.de/sandbox/carve'

const source = ref(DEFAULT_SOURCE)
const fullscreen = ref(false)

// --- Engine selection: JS (default, in-page) or Rust/WASM (in-page, lazy). ---
type Engine = 'js' | 'rust'
const engine = ref<Engine>('js')

// The Rust engine is the carve-rs parser compiled to WASM (vendored under
// ../../carve-wasm). It is loaded lazily on first selection so the JS-only
// experience never pays for the ~250 KB module download.
let wasmToHtml: ((source: string) => string) | null = null
const wasmReady = ref(false)
const wasmError = ref<string | null>(null)

async function ensureWasm(): Promise<void> {
  if (wasmToHtml || typeof window === 'undefined') return
  try {
    // @ts-expect-error - vendored WASM glue without TS resolution context
    const mod = await import('../../carve-wasm/carve_wasm.js')
    await mod.default() // instantiate the WASM module (resolves its own .wasm)
    // `toHtmlFull` renders with carve-rs's built-in extensions enabled, to
    // match the JS engine's extensions-on output as closely as carve-rs allows.
    wasmToHtml = mod.toHtmlFull as (source: string) => string
    wasmReady.value = true
  } catch (err) {
    wasmError.value = err instanceof Error ? err.message : String(err)
  }
}

watch(engine, (e) => {
  if (e === 'rust') void ensureWasm()
})

const outputEl = ref<HTMLElement | null>(null)
const sourceEl = ref<HTMLTextAreaElement | null>(null)

// Proportional scroll sync between the source and rendered panes. A guard
// flag stops the programmatic scroll from echoing back into a feedback loop.
let isSyncing = false
function syncScroll(from: HTMLElement, to: HTMLElement): void {
  if (isSyncing) return
  isSyncing = true
  const range = from.scrollHeight - from.clientHeight
  const ratio = range > 0 ? from.scrollTop / range : 0
  to.scrollTop = ratio * (to.scrollHeight - to.clientHeight)
  requestAnimationFrame(() => {
    isSyncing = false
  })
}
function onSourceScroll(): void {
  if (sourceEl.value && outputEl.value) syncScroll(sourceEl.value, outputEl.value)
}
function onOutputScroll(): void {
  if (sourceEl.value && outputEl.value) syncScroll(outputEl.value, sourceEl.value)
}

// Render result plus the wall-clock time the parse+render took, so the UI can
// surface how fast each engine is. `ms` is null while the result is a status
// placeholder (WASM still loading or failed) rather than a real render.
const rendered = computed<{ html: string; ms: number | null }>(() => {
  // Rust engine: render in-page once the WASM module has instantiated.
  if (engine.value === 'rust') {
    if (wasmError.value) {
      return {
        html: `<pre class="carve-playground-error">Failed to load the Rust (WASM) engine: ${escapeHtml(wasmError.value)}</pre>`,
        ms: null,
      }
    }
    if (!wasmReady.value) {
      return {
        html: `<pre class="carve-playground-note">Loading the Rust (WASM) engine…</pre>`,
        ms: null,
      }
    }
  }
  try {
    const useWasm = engine.value === 'rust' && wasmToHtml
    const t0 = performance.now()
    let out = (
      useWasm ? wasmToHtml!(source.value) : carveToHtml(source.value, { extensions: JS_EXTENSIONS })
    ) as string
    const ms = performance.now() - t0
    // The demo references images with a doc-relative path; resolve it against
    // the site base so it loads from /public regardless of the page URL shape.
    out = out.replace(/src="images\//g, `src="${withBase('/images/')}`)
    return { html: out, ms }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { html: `<pre class="carve-playground-error">${escapeHtml(message)}</pre>`, ms: null }
  }
})

const html = computed<string>(() => rendered.value.html)

// One-line status for the toolbar: the active engine and its last render time.
// Gate the render-time text behind mount: `performance.now()` differs between
// the server-rendered build and the client, so showing it during SSR causes a
// Vue hydration mismatch. Pre-mount renders just the engine label (stable on
// both sides); the timing appears once the client takes over.
const mounted = ref(false)
const renderStatus = computed<string>(() => {
  if (engine.value === 'rust') {
    if (wasmError.value) return 'Rust (WASM): load failed'
    if (!wasmReady.value) return 'Rust (WASM): loading…'
  }
  const label = engine.value === 'rust' ? 'Rust (WASM)' : 'JavaScript'
  const ms = mounted.value ? rendered.value.ms : null
  return ms === null ? label : `${label}: ${ms < 1 ? ms.toFixed(3) : ms.toFixed(2)} ms`
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
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

// --- Syntax highlighting: Shiki, lazy-loaded, dual-theme. ---
// The carve-lib renderer emits plain `<code class="language-x">`; highlight it
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
      // The repo's Carve TextMate grammar, so `language-carve` blocks highlight too.
      const carveGrammar = (await import('../../syntaxes/carve.tmLanguage.json')).default
      return createHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: [
          'python', 'yaml', 'json', 'bash', 'javascript', 'typescript', 'tsx',
          'html', 'css', 'rust', 'php', 'markdown', 'sql', 'go', 'c',
          carveGrammar as never,
        ],
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
  const loaded: string[] = hl.getLoadedLanguages()
  for (const code of codes) {
    const pre = code.parentElement
    if (!pre) continue
    const cls = [...code.classList].find((c) => c.startsWith('language-'))
    const lang = cls ? cls.slice('language-'.length) : ''
    if (!loaded.includes(lang)) continue // unknown language: leave the plain block
    try {
      const out = hl.codeToHtml(code.textContent ?? '', {
        lang,
        themes: { light: 'github-light', dark: 'github-dark' },
      }) as string
      const tmp = document.createElement('div')
      tmp.innerHTML = out
      const shikiPre = tmp.firstElementChild
      if (shikiPre) pre.replaceWith(shikiPre)
    } catch {
      // Leave the original code block in place on a highlight error.
    }
  }
}

// Mermaid first (it replaces blocks), then highlight code, then render math.
async function postProcessOutput(): Promise<void> {
  await renderMermaid()
  await highlightCode()
  await renderMathIn(outputEl.value)
}

let debounce: ReturnType<typeof setTimeout> | undefined
function schedulePostProcess(): void {
  if (typeof window === 'undefined') return
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    void nextTick(postProcessOutput)
  }, 200)
}

watch(html, schedulePostProcess)
onMounted(() => {
  mounted.value = true
  void nextTick(postProcessOutput)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(debounce)
})

// --- Full screen ---
function toggleFullscreen(): void {
  fullscreen.value = !fullscreen.value
}
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && fullscreen.value) fullscreen.value = false
}
// Avoid an "unused" warning while keeping the flag meaningful to tooling.
void mermaidInit
</script>

<template>
  <div class="carve-playground" :class="{ fullscreen }">
    <div class="pg-toolbar">
      <div class="pg-engines" role="group" aria-label="Rendering engine">
        <span class="pg-engines-label">Engine</span>
        <button
          class="pg-engine"
          type="button"
          :class="{ active: engine === 'js' }"
          :aria-pressed="engine === 'js'"
          @click="engine = 'js'"
        >
          JavaScript
        </button>
        <button
          class="pg-engine"
          type="button"
          :class="{ active: engine === 'rust' }"
          :aria-pressed="engine === 'rust'"
          @click="engine = 'rust'"
        >
          Rust (WASM)
        </button>
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
        <span class="pg-status" aria-live="polite">{{ renderStatus }}</span>
        <button class="pg-btn" type="button" @click="toggleFullscreen">
          {{ fullscreen ? 'Exit full screen (Esc)' : 'Full screen' }}
        </button>
      </div>
    </div>
    <div class="pg-grid">
      <div class="pane">
        <label>Carve source</label>
        <textarea
          ref="sourceEl"
          v-model="source"
          spellcheck="false"
          wrap="off"
          @scroll="onSourceScroll"
        />
      </div>
      <div class="pane">
        <label>Rendered HTML</label>
        <div
          ref="outputEl"
          class="output vp-doc carve-render"
          v-html="html"
          @scroll="onOutputScroll"
        />
      </div>
      <div class="pane pane-full">
        <label>HTML source</label>
        <pre class="raw">{{ html }}</pre>
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
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
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
  gap: 0.8rem;
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
</style>
