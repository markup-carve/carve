<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { withBase } from 'vitepress'
// @ts-expect-error - vendored ESM module without TS resolution context
import { carveToHtml } from '../../carve-lib/index.js'
// The canonical feature-demo document (also used by the VS Code extension),
// loaded as raw Carve source via vite-plugin-carve.
import { source as DEFAULT_SOURCE } from '../../examples/demo.crv'

const source = ref(DEFAULT_SOURCE)
const fullscreen = ref(false)
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

const html = computed<string>(() => {
  try {
    let out = carveToHtml(source.value) as string
    // The demo references images with a doc-relative path; resolve it against
    // the site base so it loads from /public regardless of the page URL shape.
    out = out.replace(/src="images\//g, `src="${withBase('/images/')}`)
    return out
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return `<pre class="carve-playground-error">${escapeHtml(message)}</pre>`
  }
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
  const blocks = root.querySelectorAll<HTMLElement>('pre > code.language-mermaid')
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
  for (const code of Array.from(blocks)) {
    const pre = code.parentElement
    if (!pre) continue
    const definition = code.textContent ?? ''
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

let debounce: ReturnType<typeof setTimeout> | undefined
function scheduleMermaid(): void {
  if (typeof window === 'undefined') return
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    void nextTick(renderMermaid)
  }, 200)
}

watch(html, scheduleMermaid)
onMounted(() => {
  void nextTick(renderMermaid)
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
      <span class="pg-hint">Live Carve → HTML — edit on the left.</span>
      <button class="pg-btn" type="button" @click="toggleFullscreen">
        {{ fullscreen ? 'Exit full screen (Esc)' : 'Full screen' }}
      </button>
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
.pg-hint {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
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
