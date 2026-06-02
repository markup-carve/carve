<script setup lang="ts">
import { ref, computed } from 'vue'
// @ts-expect-error - vendored ESM module without TS resolution context
import { carveToHtml } from '../../carve-lib/index.js'
// The canonical feature-demo document (also used by the VS Code extension),
// loaded as raw Carve source via vite-plugin-carve.
import { source as DEFAULT_SOURCE } from '../../examples/demo.crv'

const source = ref(DEFAULT_SOURCE)

const html = computed<string>(() => {
  try {
    return carveToHtml(source.value) as string
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return `<pre class="carve-playground-error">${escapeHtml(message)}</pre>`
  }
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
</script>

<template>
  <div class="carve-playground">
    <div class="pane">
      <label>Carve source</label>
      <textarea v-model="source" spellcheck="false" wrap="off" />
    </div>
    <div class="pane">
      <label>Rendered HTML</label>
      <div class="output vp-doc carve-render" v-html="html" />
    </div>
    <div class="pane pane-full">
      <label>HTML source</label>
      <pre class="raw">{{ html }}</pre>
    </div>
  </div>
</template>

<style scoped>
.carve-playground {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: minmax(280px, 45vh) minmax(180px, 30vh);
  gap: 1rem;
  margin: 1rem 0;
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
@media (max-width: 768px) {
  .carve-playground {
    grid-template-columns: 1fr;
    grid-template-rows: 320px 320px 200px;
  }
  .pane-full {
    grid-column: 1;
  }
}
</style>
