---
title: Live examples (dogfood)
description: Carve examples rendered by the real parser via vite-plugin-carve.
---

# Live examples (dogfood proof-of-concept)

These examples are **real `.crv` files** in `docs/examples-live/`, rendered to HTML by the actual carve parser at build time through [`@markup-carve/vite-plugin-carve`](https://github.com/markup-carve/vite-plugin-carve). The right column is *live output*, not hand-authored - so a parser regression breaks the docs build, and there is no `::: compare` markdown-it-container wrapper to collide with `:::` content.

Compare with the hand-authored [examples page](/examples), where the HTML column is written by hand and wrapped in `::: compare`.

## Admonitions

<CarveExample name="admonition-note" />

A quoted title renders as `<p class="admonition-title">`:

<CarveExample name="admonition-tip-title" />

An admonition may contain block children (a list here) - the `:::` body no longer breaks the page because there is no container wrapping it:

<CarveExample name="admonition-tip-list" />

A non-canonical type word is a generic `<div>`:

<CarveExample name="admonition-hint" />

## Line block

Per-line layout preserved, leading whitespace as `&nbsp;`:

<CarveExample name="line-block" />

---

::: tip How this works
Each block above is `<CarveExample name="x" />`, which imports `docs/examples-live/x.crv`. The plugin gives `source` (raw carve) and the default export (rendered HTML). One `.crv` file is the single source of truth - no duplicated expected HTML.
:::
