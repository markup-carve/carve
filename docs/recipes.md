# Styling Recipes

Carve's core containers and attributes give CSS hooks without changing the document language. The [block chapter](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#fences-divs-and-comment-blocks) defines container names and [HTML rendering](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#quotes-divs-and-their-sigil-forms) defines their output. Use a named div for grouping and a class for styling.

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

CSS can change presentation, but it cannot create a missing heading, alternate text, or a link target. An application extension can transform a node when it needs new semantics. It must keep a valid core fallback. See [extensions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md) and [SVG images](./svg-images).
