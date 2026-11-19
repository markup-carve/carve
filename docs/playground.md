---
title: Playground
description: Live Carve 0.2 to HTML preview in your browser.
aside: false
sidebar: false
pageClass: playground-page
---

# Playground

<div class="playground-intro">

Type Carve on the left. The rendered result and generated HTML appear on the right.\
Processing happens in your browser; the document is not sent to a server.\
The playground uses the pinned [Carve 0.2 JavaScript engine](https://github.com/markup-carve/carve-js/tree/next2).

<div class="playground-notes">

::: details Formatting the source
**Format** rewrites the source with the 0.2 canonical writer. With **Align tables** on, table columns are padded so their pipes line up. One undo (Ctrl+Z) restores the previous text. The **Formatted source** tab lets you inspect the result first.
:::

::: details Sharing a document as a link
The **share button** puts the document and render options in the URL fragment, so you can bookmark or send the current view. The fragment is compressed in the browser and is not sent to the site server. Very large documents are refused rather than truncated.

A received link always opens with **raw HTML off**, even when its sender enabled it. Other render options are restored. Reload the playground without the fragment to start a new local session.
:::

</div>

</div>

<Playground />

## Render options

The **Options** button opens the 0.2 profile, heading ID, section, smart typography, and raw HTML controls. Raw HTML starts off. Turn it on only for source you trust. The **Tree JSON** and **Lint** tabs show the 0.2 parser and linter results.

## Engines and import

The in-page engine is Carve 0.2 JavaScript. The Rust WASM button is disabled because the bundled Rust build implements 0.1. The PHP sandbox link remains available for external experiments; it is not the engine behind this preview.

The 0.2 browser bundle does not expose HTML import, so this playground has no Import button. The 0.2 CLI supports `carve import --from=html`. To import Markdown, convert it to HTML first, then import that HTML. See the [0.2 tooling specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md).

## Visual editor

Prefer direct visual editing to this source-to-preview flow? The [Carve visual editor](https://markup-carve.github.io/carve-wysiwyg/) offers rich editing while keeping the source available for inspection.

## Build-time example

This example is read from a `.crv` file and rendered by the pinned 0.2 JavaScript engine during the docs build.

<DogfoodCarve />

## Engine revision

The exact Carve 0.2 JavaScript revision is pinned in `package.json`. The browser bundle used here is built from that revision.
