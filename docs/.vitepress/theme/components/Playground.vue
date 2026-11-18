<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { render, parse, lint, format } from '../../engine-v2.js'
import { encodeShare, decodeShare } from '../../share-link.js'
import { renderMathIn } from '../../render-math.js'
import { source as DEFAULT_SOURCE } from '../../examples/demo.crv'

type Profile = 'full' | 'article' | 'comment' | 'minimal'
type HeadingIds = 'off' | 'keep-case' | 'lower' | 'ascii' | 'ascii-lower' | 'ascii-strict' | 'ascii-strict-lower'
type Output = 'html' | 'tree' | 'lint' | 'fmt'
type SharedOptions = {
  profile: Profile
  headingIds: HeadingIds
  sections: boolean
  smartTypography: boolean
  rawHtml: boolean
}
const source = ref(DEFAULT_SOURCE)
const profile = ref<Profile>('full')
const headingIds = ref<HeadingIds>('keep-case')
const sections = ref(true)
const smartTypography = ref(true)
const rawHtml = ref(false)
const fromSharedLink = ref(false)
const output = ref<Output>('html')
const shareMessage = ref('')
const formatMessage = ref('')
const preview = ref<HTMLElement | null>(null)
const mounted = ref(false)
const options = computed(() => ({
  profile: profile.value,
  headingIds: headingIds.value,
  sections: sections.value,
  smartTypography: smartTypography.value,
  rawHtml: rawHtml.value && !fromSharedLink.value,
}))
const shareOptions = (): SharedOptions => ({ ...options.value })
const profileValues: Profile[] = ['full', 'article', 'comment', 'minimal']
const headingValues: HeadingIds[] = ['off', 'keep-case', 'lower', 'ascii', 'ascii-lower', 'ascii-strict', 'ascii-strict-lower']

function safeValue<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback
}

const result = computed(() => {
  try {
    const started = performance.now()
    const html = render(source.value, options.value)
    return { html, ms: performance.now() - started, error: '' }
  } catch (error) {
    return { html: '', ms: 0, error: error instanceof Error ? error.message : String(error) }
  }
})
const tree = computed(() => {
  try { return JSON.stringify(parse(source.value, { headingIds: headingIds.value }), null, 2) }
  catch (error) { return error instanceof Error ? error.message : String(error) }
})
const findings = computed(() => {
  try {
    const entries = lint(source.value)
    return entries.length ? JSON.stringify(entries, null, 2) : 'No lint findings.'
  } catch (error) { return error instanceof Error ? error.message : String(error) }
})
const formatted = computed(() => {
  try { return format(source.value) }
  catch (error) { return error instanceof Error ? error.message : String(error) }
})

function formatSource(): void {
  try {
    const next = format(source.value)
    formatMessage.value = next === source.value ? 'Already formatted.' : 'Formatted.'
    source.value = next
  } catch (error) {
    formatMessage.value = error instanceof Error ? error.message : String(error)
  }
}

async function share(): Promise<void> {
  const encoded = await encodeShare({ source: source.value, options: shareOptions() })
  if (!encoded) { shareMessage.value = 'Document is too long for a share link.'; return }
  const url = `${location.origin}${location.pathname}${location.search}#${encoded}`
  history.replaceState(null, '', url)
  try {
    await navigator.clipboard.writeText(url)
    shareMessage.value = 'Link copied.'
  } catch {
    shareMessage.value = 'Link is in the address bar.'
  }
}

onMounted(async () => {
  mounted.value = true
  const state = await decodeShare(location.hash)
  if (state) {
    fromSharedLink.value = true
    source.value = state.source
    const saved = state.options ?? {}
    profile.value = safeValue(saved.profile, profileValues, 'full')
    headingIds.value = safeValue(saved.headingIds, headingValues, 'keep-case')
    sections.value = saved.sections === undefined ? true : saved.sections === true
    smartTypography.value = saved.smartTypography === undefined ? true : saved.smartTypography === true
    rawHtml.value = false
  }
  void renderMathIn(preview.value)
})
// Math is enhanced after Vue replaces the preview's DOM.
watch(result, async () => { await nextTick(); await renderMathIn(preview.value) })
</script>

<template>
  <div class="carve-playground">
    <div class="pg-toolbar">
      <strong>Carve 0.2 JavaScript</strong>
      <div class="pg-actions">
        <button type="button" @click="formatSource">Format source</button>
        <button type="button" @click="share">Share link</button>
        <span role="status">{{ formatMessage || shareMessage }}</span>
      </div>
    </div>
    <fieldset class="pg-options">
      <legend>Render options</legend>
      <label>Profile
        <select v-model="profile">
          <option v-for="value in profileValues" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>
      <label>Heading IDs
        <select v-model="headingIds">
          <option v-for="value in headingValues" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>
      <label><input v-model="sections" type="checkbox"> Sections</label>
      <label><input v-model="smartTypography" type="checkbox"> Smart typography</label>
      <label title="A shared document always renders with raw HTML off"><input v-model="rawHtml" type="checkbox" :disabled="fromSharedLink"> Raw HTML</label>
    </fieldset>
    <p v-if="fromSharedLink" class="pg-note">This shared document renders with raw HTML off. Its other render options came from the link.</p>
    <div class="pg-grid">
      <label class="pg-pane">Carve source
        <textarea v-model="source" spellcheck="false" aria-label="Carve source" />
      </label>
      <section class="pg-pane" aria-label="Rendered HTML">
        <div class="pg-pane-title">Rendered HTML <small v-if="mounted && !result.error">{{ result.ms.toFixed(2) }} ms</small></div>
        <pre v-if="result.error" class="pg-error">{{ result.error }}</pre>
        <div v-else ref="preview" class="pg-preview carve carve-render" v-html="result.html" />
      </section>
    </div>
    <div class="pg-tabs" role="group" aria-label="Output type">
      <button v-for="tab in (['html', 'tree', 'lint', 'fmt'] as Output[])" :key="tab" type="button" :aria-pressed="output === tab" @click="output = tab">
        {{ tab === 'html' ? 'HTML' : tab === 'tree' ? 'Tree JSON' : tab === 'lint' ? 'Lint' : 'Formatted Carve' }}
      </button>
    </div>
    <pre class="pg-output" aria-live="polite">{{ output === 'html' ? (result.error || result.html) : output === 'tree' ? tree : output === 'lint' ? findings : formatted }}</pre>
  </div>
</template>

<style scoped>
.carve-playground { margin: 1rem 0; }
.pg-toolbar, .pg-actions, .pg-tabs, .pg-options { display: flex; flex-wrap: wrap; align-items: center; gap: .65rem; }
.pg-toolbar { justify-content: space-between; margin-bottom: .75rem; }
.pg-options { border: 1px solid var(--vp-c-divider); border-radius: 8px; margin: 0 0 .75rem; padding: .5rem .8rem .8rem; }
.pg-options label { display: inline-flex; gap: .3rem; align-items: center; font-size: .85rem; }
.pg-options select { max-width: 12rem; }
.pg-options input { margin: 0; }
.pg-note { color: var(--vp-c-text-2); font-size: .85rem; }
.pg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.pg-pane { display: flex; flex-direction: column; min-width: 0; font-weight: 600; }
.pg-pane-title { display: flex; justify-content: space-between; }
.pg-pane-title small { font-weight: 400; color: var(--vp-c-text-2); }
.pg-pane textarea, .pg-preview, .pg-output, .pg-error { box-sizing: border-box; width: 100%; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 8px; color: var(--vp-c-text-1); padding: .85rem; }
.pg-pane textarea, .pg-preview { height: 25rem; overflow: auto; margin-top: .35rem; }
.pg-pane textarea { font: .9rem/1.5 var(--vp-font-family-mono); resize: vertical; white-space: pre; }
.pg-preview { font-weight: 400; }
.pg-tabs { margin: .8rem 0 .4rem; }
button, select { font: inherit; color: var(--vp-c-text-1); background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 6px; padding: .3rem .6rem; cursor: pointer; }
button[aria-pressed="true"] { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.pg-output { min-height: 8rem; max-height: 25rem; overflow: auto; font: .85rem/1.5 var(--vp-font-family-mono); white-space: pre-wrap; overflow-wrap: anywhere; }
.pg-error { color: var(--vp-c-danger-1); white-space: pre-wrap; }
@media (max-width: 760px) { .pg-grid { grid-template-columns: 1fr; } }
</style>
