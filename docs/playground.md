---
title: Playground
description: Live Carve to HTML preview, in your browser.
---

# Playground

Type Carve on the left. The rendered result and generated HTML appear on the
right. Processing happens in your browser; the document is not sent to a
server. The playground uses the [JavaScript
parser](https://github.com/markup-carve/carve-js) tested by this project's
shared input/output tests.

::: details Formatting the source
**Format** rewrites the source in the canonical Carve layout, the same output as `carve fmt`. With **Align tables** on, table columns are padded so their pipes line up. One undo (Ctrl+Z) restores the previous text. The selected engine does the formatting: in Rust mode the bundled WASM build runs its own writer.
:::

::: details Sharing a document as a link
The **share button** in the toolbar puts the whole document in the URL fragment, so a playground state is bookmarkable and sendable. The fragment never reaches a server: it is compressed and base64-encoded in the browser, and decoded there again. Very large documents are refused rather than turned into a link that arrives truncated.

**Opening someone else's link.** A document that arrives in a link renders with **raw HTML disabled**: raw blocks show as escaped text instead of running. A link is written by whoever sent it, and enabling raw HTML would make one a way to run script on this site. A link made in Rust mode opens on the JavaScript engine if the bundled Rust engine cannot disable raw HTML or fails to load. The output may then differ from what the sender saw. Reload the playground without the fragment for a normal session.
:::

<Playground />

## Visual editor

Prefer direct visual editing to this source-to-preview flow? The [Carve visual editor](https://markup-carve.github.io/carve-wysiwyg/) offers rich WYSIWYG authoring while keeping the underlying Carve source available for inspection.

## Build-time example

This example is read from a `.crv` file and converted to HTML during the
VitePress build by `@markup-carve/vite-plugin-carve`.

<DogfoodCarve />

## Version used by this playground

The playground and documentation examples use
[`@markup-carve/carve`](https://github.com/markup-carve/carve-js). The exact
source revision is recorded in `package.json`, so the examples do not change
when a new package version is published.
