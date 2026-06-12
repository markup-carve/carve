<script setup lang="ts">
// Dogfood: render a real `.crv` example through @markup-carve/vite-plugin-carve.
// The `source` (raw carve) and the default export (HTML rendered by the actual
// carve parser at build time) come straight from the plugin - no hand-authored
// expected HTML, and no `::: compare` markdown-it-container wrapper.
const props = defineProps<{ name: string }>()

const modules = import.meta.glob('../../../examples-live/*.crv', { eager: true }) as Record<
  string,
  { default: string; source: string }
>

const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${props.name}.crv`))
const source = entry ? entry[1].source.replace(/\n$/, '') : `(missing example: ${props.name}.crv)`
const html = entry ? entry[1].default : ''
</script>

<template>
  <div class="carve-example">
    <div class="carve-example-pane">
      <div class="carve-example-label">Carve source</div>
      <pre class="carve-example-src"><code>{{ source }}</code></pre>
    </div>
    <div class="carve-example-pane">
      <div class="carve-example-label">Rendered (live)</div>
      <div class="carve-example-out" v-html="html" />
    </div>
  </div>
</template>

<style scoped>
.carve-example {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}
@media (max-width: 720px) {
  .carve-example { grid-template-columns: 1fr; }
}
.carve-example-pane { padding: 0.75rem 1rem; }
.carve-example-pane + .carve-example-pane { border-left: 1px solid var(--vp-c-divider); }
.carve-example-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2);
  margin-bottom: 0.4rem;
}
.carve-example-src {
  margin: 0;
  background: var(--vp-c-bg-alt);
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
  font-size: 0.85em;
  white-space: pre-wrap;
}
.carve-example-out :deep(aside.admonition),
.carve-example-out :deep(div.line-block) {
  margin: 0;
}
</style>
