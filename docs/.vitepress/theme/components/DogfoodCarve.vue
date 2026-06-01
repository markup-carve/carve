<script setup lang="ts">
import html, { source } from '../../examples/quick.crv'
</script>

<template>
  <div class="dogfood-carve">
    <div>
      <h3>Imported Carve</h3>
      <pre><code>{{ source }}</code></pre>
    </div>
    <div>
      <h3>Rendered HTML</h3>
      <!-- The source is local docs content rendered at build time. -->
      <div class="dogfood-carve-output" v-html="html" />
    </div>
  </div>
</template>
