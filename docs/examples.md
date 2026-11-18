---
title: Examples
description: Carve 0.2 source and HTML from the pinned 0.2 JavaScript engine.
---

# Examples

These examples start with the [0.2 specification cases](https://github.com/markup-carve/carve/tree/next2/spec/0.2/conformance). The generator formats each source with the 0.2 writer and renders the displayed HTML with the same engine as the playground. Select **Rendered** to see the HTML in the page.

| Page | Contents |
|---|---|
| [Core](/examples/core) | 0.2 core block and inline syntax. |
| [Extensions](/examples/extensions) | The provisional tabs extension and its core fallback. |
| [Processor options](/examples/processor-options) | Profiles, heading IDs, sections, typography, and raw HTML. |
| [Edge cases](/examples/edge-cases/) | Literal and incomplete syntax from the 0.2 cases. |

See the [0.2 block](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md), [inline](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md), and [HTML](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md) chapters for the rules behind each example.

Three short source and HTML pairs follow.

## A document section

```crv
= Notes

A [link](https://example.com) and /emphasis/.

- First point
- Second point
```

```html
<section id="Notes">
  <h1>Notes</h1>
  <p>A <a href="https://example.com">link</a> and <em>emphasis</em>.</p>
  <ul>
    <li>First point</li>
    <li>Second point</li>
  </ul>
</section>
```

## A table with a caption

```crv
|= Item |={>} Count |
| Apples | 3 |
| Pears | 4 |
^ Inventory
```

```html
<table>
  <caption>Inventory</caption>
  <thead>
    <tr><th scope="col">Item</th><th scope="col" style="text-align: right;">Count</th></tr>
  </thead>
  <tbody>
    <tr><td>Apples</td><td style="text-align: right;">3</td></tr>
    <tr><td>Pears</td><td style="text-align: right;">4</td></tr>
  </tbody>
</table>
```

## A named container

```crv
::: note "Read this"
The title and body have different roles.
:::
```

```html
<aside class="admonition note" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Read this</p>
  <p>The title and body have different roles.</p>
</aside>
```

Run `carve2 render` to inspect HTML and `carve2 fmt --check` to check canonical source. The [cheat sheet](./cheatsheet) covers more forms; [Upgrading from 0.1](./upgrade-0-2) covers sources that render differently in 0.2.
