---
title: Playground
description: Live Carve to HTML preview, in your browser.
---

# Playground

Type Carve on the left, see the rendered HTML on the right (and the raw HTML below). Everything runs client-side, no network round-trip — the same [reference parser](https://github.com/markup-carve/carve-js) that backs the spec corpus.

<Playground />

## Vite Plugin Dogfood

The docs build also imports a `.crv` file through `@markup-carve/vite-plugin-carve`
and renders the generated HTML during the VitePress build.

<DogfoodCarve />

## What this proves

- Every construct in the [Quick Reference](/) and every pair in the [Examples](./examples) flows through the same parser → AST → renderer pipeline you see here.
- Edits round-trip in single-digit milliseconds. Carve's linear-time parsing is the reason.
- The current build comes from [`@markup-carve/carve`](https://github.com/markup-carve/carve-js), pinned to an exact carve-js commit in the repo's `package.json`.
