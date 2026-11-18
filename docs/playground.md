---
title: Playground
description: Live Carve 0.2 to HTML preview in your browser.
aside: false
sidebar: false
pageClass: playground-page
---

# Playground

Write Carve source on the left. The 0.2 JavaScript engine renders it in your browser. The preview and the HTML, tree JSON, lint, and formatted source views update as you type.

The render controls correspond to the [0.2 host options](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options). Raw HTML starts off. Turn it on only for source you trust. The profile can restrict which constructs appear in the output.

**Format source** uses the [0.2 writer](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md). The formatted view lets you inspect the result before replacing your source.

**Share link** puts the source and render options in the URL fragment. The document stays in the browser. A link received from someone else always opens with raw HTML off, even if the sender enabled it. Other options are restored from the link.

<Playground />

## Using the command line

The 0.2 CLI offers `render`, `ast`, `lint`, `fmt`, `import`, and `upgrade`. Use `carve2 import --from=html` for HTML input. For Markdown, first convert it to HTML, then import the HTML. See [the 0.2 tooling specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md).

## Build-time example

This `.crv` file is rendered by the pinned 0.2 JavaScript engine for the docs build.

<DogfoodCarve />

## Engine revision

The exact `carve-js` `next2` commit is pinned in `package.json`. The browser bundle used here is built from that same revision. The 0.1 Rust WASM bundle is not used for 0.2 rendering.
