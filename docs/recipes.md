---
description: Constructs that need no extension and no engine support - only CSS on the HTML Carve already emits.
---

# Styling Recipes

Carve has no `tree` construct, no `cards` construct and no `columns` construct.
It does not need them. Three pieces of core syntax, all Tier-1 and always on,
hand the styling layer everything it needs:

| Seam | You write | The engine emits |
| --- | --- | --- |
| A container word with no handler | `::: cards` | `<div class="cards">` |
| A span class | `[beta]{.badge}` | `<span class="badge">` |
| An attribute line above a block | `{#id .x data-y="2"}` | the id, classes and `data-*` on that element |

An unregistered `::: name` renders as a generic div carrying the word as a
class, a documented part of the [extension contract](/extensions). So the tree
below already renders correctly out of every engine, with no extension, no
configuration and no parser change. The only thing ever missing was CSS.

[carve-css](https://github.com/markup-carve/carve-css) ships that CSS as an
opt-in layer:

```css
@import "@markup-carve/carve-css";
@import "@markup-carve/carve-css/recipes.css";
```

Every example on this page is rendered live by that stylesheet.

## Trees

A nested list inside `::: tree`. The connectors are pseudo-elements on the list
items, not characters in the source, so the markup stays a real `<ul>`: a screen
reader still announces the nesting, in-page search still finds the leaves, and
every node can be a link. Pasted `tree(1)` art in a code fence gives up all
three.

:::: compare

```carve
::: tree
- src/
  - parser/
    - blocks.crv
    - inline.crv
  - render/
    - html.crv
- tests/
:::
```

```html
<div class="tree">
  <ul>
    <li>src/
      <ul>
        <li>parser/
          <ul>
            <li>blocks.crv</li>
            <li>inline.crv</li>
          </ul>
        </li>
        <li>render/
          <ul>
            <li>html.crv</li>
          </ul>
        </li>
      </ul>
    </li>
    <li>tests/</li>
  </ul>
</div>
```

::::

Per-instance variation comes from an attribute rather than a second class.
`data-guides` takes `dotted` or `none`.

:::: compare

```carve
{data-guides="dotted"}
::: tree
- docs/
  - index.crv
:::
```

```html
<div class="tree" data-guides="dotted">
  <ul>
    <li>docs/
      <ul>
        <li>index.crv</li>
      </ul>
    </li>
  </ul>
</div>
```

::::

## Cards

A list, laid out as panels. It stays a list, which matters: the same source
renders as ordinary bullets in the Markdown, ANSI and plain-text targets.

:::: compare

```carve
::: cards
- *Parse* - source to AST.
- *Render* - AST to a target.
- *Format* - AST back to source.
:::
```

```html
<div class="cards">
  <ul>
    <li><strong>Parse</strong> - source to AST.</li>
    <li><strong>Render</strong> - AST to a target.</li>
    <li><strong>Format</strong> - AST back to source.</li>
  </ul>
</div>
```

::::

## Columns

`data-columns` sets the count, so one class covers every arity instead of
multiplying into `.columns-2`, `.columns-3` and whatever comes next. Blocks are
kept whole across a column boundary, and the layout collapses to a single column
on a narrow screen.

:::: compare

```carve
{data-columns="3"}
::: columns
First run of text.

Second run of text.
:::
```

```html
<div class="columns" data-columns="3">
  <p>First run of text.</p>
  <p>Second run of text.</p>
</div>
```

::::

## Steps

An ordered list whose numbers come from a CSS counter, so they can be a shape
the list marker cannot be while the document still says "ordered list".

:::: compare

```carve
::: steps
1. Install the package.
2. Import the stylesheet.
3. Add the recipes layer.
:::
```

```html
<div class="steps">
  <ol>
    <li>Install the package.</li>
    <li>Import the stylesheet.</li>
    <li>Add the recipes layer.</li>
  </ol>
</div>
```

::::

## Margin notes

`::: aside` floats into the gutter where there is a gutter to float into, and
becomes an ordinary indented block on a narrow screen - which is what the
content meant anyway.

:::: compare

```carve
::: aside
A note set beside the text on a wide screen.
:::
```

```html
<div class="aside">
  <p>A note set beside the text on a wide screen.</p>
</div>
```

::::

## Lead paragraphs and badges

Neither needs a container: an attribute line above a paragraph, and a span class
inline.

::: compare

```carve
{.lead}
An opening paragraph, marked by an attribute line.
```

```html
<p class="lead">An opening paragraph, marked by an attribute line.</p>
```

:::

`data-tone` picks from the same semantic pairs the admonitions use, so a badge
and a warning agree about what warning looks like.

::: compare

```carve
Status: [beta]{.badge}, [stable]{.badge data-tone="success"}.
```

```html
<p>Status: <span class="badge">beta</span>, <span class="badge" data-tone="success">stable</span>.</p>
```

:::

## Table modifiers

Attributes on the line above a table reach the `<table>`, and attributes on a
row's closing pipe reach its `<tr>`. Between them that covers most of what
people install a table plugin for.

::: compare

```carve
{.striped .compact}
|= Engine |= Recipes |
| carve-js | yes |{.ok}
| carve-rs | partial |{.warn}
```

```html
<table class="striped compact">
  <thead>
    <tr><th scope="col">Engine</th><th scope="col">Recipes</th></tr>
  </thead>
  <tbody>
    <tr class="ok"><td>carve-js</td><td>yes</td></tr>
    <tr class="warn"><td>carve-rs</td><td>partial</td></tr>
  </tbody>
</table>
```

:::

There is no cell-level attribute in Carve, so a row is the finest grain these
can address. `{.ok}` written inside a cell is literal text, not a class.

## Where CSS stops

CSS cannot hold state. Anything that has to remember whether it is open, or
which of several things is selected, needs an element carrying that state - or
script.

| You want | CSS alone? | Reach for |
| --- | --- | --- |
| A branch that folds | no | `::: details` per branch, or a host renderer |
| Tabs | no | the [Tabs extension](/extensions) |
| A copy button, search, sorting | no | your own page script |
| Syntax highlighting | no | any highlighter, on the `language-*` class |
| Highlighting particular code lines | no | a highlighter that emits per-line elements |

The first one needs no custom code either. `::: details` is a standard-tier
extension shipped in all three engines and turned on with a single call; nest
one per branch and the tree folds, with no JavaScript at all. The cost is the
source - the branch becomes a container, so the fence widens at every level.

::::: compare

```carve
::: tree
- :::: details "src/"
  - blocks.crv
  ::::
- tests/
:::
```

```html
<div class="tree">
  <ul>
    <li>
      <details>
        <summary>src/</summary>
        <ul>
          <li>blocks.crv</li>
        </ul>
      </details>
    </li>
    <li>tests/</li>
  </ul>
</div>
```

:::::

## Why this is not syntax

Every recipe here could have been a construct in the language. None of them
should be. A construct costs a grammar production, a node type, a rule in three
engines, four editor grammars and a corpus category - and buys a document older
engines cannot read. The container seam costs nothing, degrades to a readable
nested list wherever the CSS is absent, and lets a house style ship recipes the
language never has to know about.

That is also why these class names are a convention rather than a spec rule, and
why the layer is a separate import: opting in is how a consumer says they use
those words the way carve-css means them.
