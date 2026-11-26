<script setup lang="ts">
import { renderDocsCarve } from '../../carve-extensions.js'
import { source } from '../../examples/quick.crv'
const html = renderDocsCarve(source)
</script>

<template>
  <div class="dogfood-carve">
    <div>
      <h3>Carve source</h3>
      <pre><code>{{ source }}</code></pre>
    </div>
    <div>
      <h3>Rendered HTML</h3>
      <div class="dogfood-carve-output carve carve-render" v-html="html" />
    </div>
  </div>
</template>
