---
description: Use CSS to style Carve containers as trees, cards, columns, and other layouts.
---

# Styling Recipes

Carve's core containers and attributes give CSS hooks without changing the document language. The [block chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#fences-divs-and-comment-blocks) defines container names and [HTML rendering](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#quotes-divs-and-their-sigil-forms) defines their output. Use a named div for grouping and a class for styling.

## Cards

```crv
:::: cards
::: card
= First card

A short description.
:::
::::
```

A host stylesheet can target `.cards` and `.card`. Give each card a heading so it remains useful without CSS.

## Steps

```crv
::: steps
1. Prepare the source
2. Render the page
3. Check the links
:::
```

The ordered list retains its meaning without the `steps` style. For a tree, use nested lists inside a named `tree` div. For a margin note, use a `note` div and let CSS change its placement. The source remains readable when the stylesheet is absent.

## Boundaries

CSS can change presentation, but it cannot create a missing heading, alternate text, or a link target. An application extension can transform a node when it needs new semantics. It must keep a valid core fallback. See [extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md) and [SVG images](./svg-images).

## Trees

Wrap a nested list in `::: tree` and use CSS on `.tree ul` and `.tree li`. Keep connectors in CSS pseudo-elements so the source retains real lists and links. A text-only reader can still follow the nesting.

## Columns

A named `columns` div can hold paragraphs or smaller divs. A stylesheet can use grid layout and collapse to one column on narrow screens:

```css
.columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
@media (max-width: 40rem) { .columns { grid-template-columns: 1fr; } }
```

The source order should remain the reading order. CSS columns do not change how Carve groups blocks.

## Margin notes

Use a named `aside` div or a `note` admonition for a note beside the main text. CSS can move it into the margin, but the note must remain in a useful source position when the margin is unavailable.

## Lead paragraphs and badges

An attribute line such as `{.lead}` can class the next paragraph. A span with `{.badge}` can label a short status. Keep the status text in source, and use CSS only for color and spacing. The [attribute rules](./blocks-and-attributes#attribute-placement) decide placement.

## Table modifiers

Put a class on a table with an attribute line above it. CSS can add stripes, borders, or a compact layout. Carve's header and span semantics come from the cell marks, not the class. A responsive wrapper belongs to the host layout. See [tables](./cheatsheet#tables-and-captions).

## Scrolling code blocks

Set `overflow-x: auto` on `pre` in the host stylesheet. A code fence keeps the code text and its language. Do not insert manual line breaks to fit a narrow page: they change the code content.

## Page breaks

Put `{.page-break}` above a thematic break to mark a page break:

```crv
Text of page one.

{.page-break}
***

Text of page two.
```

It renders as `<hr class="page-break">`. A print stylesheet can start a new page there and hide the rule:

```css
@media print { hr.page-break { break-after: page; border: 0; } }
```

On screen it stays a normal rule, so the break is still visible. See [page breaks](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#page-breaks).

## Why this stays in CSS

Carve source states the document structure. A class or named div gives a styling hook. If the host needs a new semantic node, use the [extension contract](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md), which requires a valid core fallback.
