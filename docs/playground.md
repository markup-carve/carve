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
**Format** rewrites the source with the 0.2 canonical writer. With **Align tables** on, table columns are padded so their pipes line up. One undo (Ctrl+Z) restores the previous text. The **Formatted source** tab shows the lines the writer would add and remove, with an **Apply** button.
:::

::: details Sharing a document as a link
The **share button** puts the document and render options in the URL fragment, so you can bookmark or send the current view. The fragment is compressed in the browser and is not sent to the site server. Very large documents are refused rather than truncated.

A link also keeps the active output tab. A received link always opens with **raw HTML off**, even when its sender enabled it. Other render options are restored.
:::

::: details Drafts
The playground saves the document in your browser and restores it on the next visit. A share link in the URL always wins over the saved draft. A draft that came from a link keeps raw HTML off after a reload. **Reset to demo** discards the draft and reloads the demo document.
:::

</div>

</div>

<Playground />

## Render options

The **Options** button opens the 0.2 profile, heading ID, section, smart typography, and raw HTML controls. Raw HTML starts off. Turn it on only for source you trust. The **Tree JSON** tab shows the 0.2 parser result.

## Output tabs

- **Lint** lists each finding with its severity, rule, message, and line and column. Click a finding to select it in the editor. **Fix** applies one quick fix; **Fix all** applies every available fix as one undo step.
- **Markdown**, **Plain text**, and **ANSI** export the document. The pane header shows how many constructs an export cannot spell. ANSI escape codes are shown as styles.

The copy and download buttons in each pane header copy or save the source (`.crv`) or the active output.

## Tools

- **Examples** loads a short 0.2 document. One undo restores the previous text.
- **Import** converts Markdown, GitHub Flavored Markdown, Djot, BBCode, or HTML to Carve. The dialog shows the result and the import diagnostics before you replace the document.
- **Upgrade 0.1** rewrites Carve 0.1 source as 0.2 and reports the number of changes.
- **Clear** empties the editor. One undo restores it.

On narrow screens these tools sit in the **More** menu.

## Engines

The in-page engine is Carve 0.2 JavaScript. The PHP sandbox link remains available for external experiments; it is not the engine behind this preview.

## Visual editor

Prefer direct visual editing to this source-to-preview flow? The [Carve visual editor](https://markup-carve.github.io/carve-wysiwyg/) offers rich editing while keeping the source available for inspection.

## Build-time example

This example is read from a `.crv` file and rendered by the pinned 0.2 JavaScript engine during the docs build.

<DogfoodCarve />

## Engine revision

The browser bundles used here are built from the carve-js revision named in `docs/.vitepress/build-engine.mjs`. The import, export, and upgrade tools load on first use.
