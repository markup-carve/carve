---
title: Playground
description: Live Carve to HTML preview, in your browser.
---

# Playground

Type Carve on the left, see the rendered HTML on the right (and the raw HTML below). Everything runs client-side, no network round-trip — the same [reference parser](https://github.com/markup-carve/carve-js) that backs the spec corpus.

::: details Sharing a document as a link
The **share button** in the toolbar puts the whole document in the URL fragment, so a playground state is bookmarkable and sendable. The fragment never reaches a server: it is compressed and base64-encoded in the browser, and decoded there again. Very large documents are refused rather than turned into a link that arrives truncated.

**Opening someone else's link.** A document that arrives in a link renders with **raw HTML disabled** — raw blocks show as escaped text instead of running. A link is written by whoever sent it, and enabling raw HTML would make one a way to run script on this site. For the same reason the Rust (WASM) engine is not offered for a shared document: its binding has no switch for raw HTML. Reload the playground without the fragment for a normal session.
:::

<Playground />

## Vite Plugin Dogfood

The docs build also imports a `.crv` file through `@markup-carve/vite-plugin-carve`
and renders the generated HTML during the VitePress build.

<DogfoodCarve />

## What this proves

- Every construct in the [Quick Reference](/) and every pair in the [Examples](./examples) flows through the same parser → AST → renderer pipeline you see here.
- Edits round-trip in single-digit milliseconds. Carve's linear-time parsing is the reason.
- The current build comes from [`@markup-carve/carve`](https://github.com/markup-carve/carve-js), pinned to an exact carve-js commit in the repo's `package.json`.
