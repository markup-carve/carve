---
description: Use CSS to style Carve containers as trees, cards, columns, and other layouts.
---

# Styling Recipes

Trees, cards and columns need no new Carve syntax. Containers, classes and attributes give CSS the HTML hooks it needs:

| HTML hook | Carve source | Generated HTML |
| --- | --- | --- |
| A container name with no extension | `::: cards` | `<div class="cards">` |
| A span class | `[beta]{.badge}` | `<span class="badge">` |
| An attribute line above a block | `{#id .x data-y="2"}` | the id, classes and `data-*` on that element |

If the host has no extension named `name`, `::: name` becomes a div with the class `name`. The tree below therefore needs CSS but no parser extension or configuration.

[carve-css](https://github.com/markup-carve/carve-css) ships that CSS as an opt-in layer:

```css
@import "@markup-carve/carve-css";
@import "@markup-carve/carve-css/recipes.css";
```

Its rules apply inside an element with the class `carve`, the wrapper a host puts around rendered Carve. Every example on this page is rendered live with that stylesheet: the Rendered tab shows the styled result, and the HTML tab shows what the engine writes.

## Trees

A nested list inside `::: tree`. The connectors are pseudo-elements on the list items, not characters in the source, so the markup stays a real `<ul>`: a screen reader still announces the nesting, in-page search still finds the leaves, and every node can be a link. Pasted `tree(1)` art in a code fence gives up all three.

:::: compare
```crv
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

Per-instance variation comes from an attribute rather than a second class. `data-guides` takes `dotted` or `none`.

:::: compare
```crv
{data-guides=dotted}
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

A list, laid out as panels. It stays a list, which matters: the same source renders as ordinary bullets in the Markdown and plain-text exports.

:::: compare
```crv
::: cards
- *Parse*: source to tree.
- *Render*: tree to HTML.
- *Format*: tree back to source.
:::
```

```html
<div class="cards">
  <ul>
    <li><strong>Parse</strong>: source to tree.</li>
    <li><strong>Render</strong>: tree to HTML.</li>
    <li><strong>Format</strong>: tree back to source.</li>
  </ul>
</div>
```
::::

## Columns

The layout has two columns by default, and `data-columns` sets 3 or 4, so one class covers every count instead of multiplying into `.columns-2`, `.columns-3` and so on. Blocks are kept whole across a column boundary, and the layout collapses to a single column on a narrow screen.

:::: compare
```crv
{data-columns=3}
::: columns
First run of text.

Second run of text.

Third run of text.
:::
```

```html
<div class="columns" data-columns="3">
  <p>First run of text.</p>
  <p>Second run of text.</p>
  <p>Third run of text.</p>
</div>
```
::::

The source order stays the reading order. CSS columns do not change how Carve groups blocks.

## Steps

An ordered list whose numbers come from a CSS counter, so they can take a shape the list marker cannot, while the document still says "ordered list".

:::: compare
```crv
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

`::: aside` floats into the margin where there is room for it, and becomes an ordinary indented block on a narrow screen, which is what the content meant anyway.

:::: compare
```crv
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

Place the note in the source where it still reads well when the margin is unavailable.

## Lead paragraphs and badges

Neither needs a container: an attribute line above a paragraph, and a span class inline.

::: compare
```crv
{.lead}
An opening paragraph, marked by an attribute line.
```

```html
<p class="lead">An opening paragraph, marked by an attribute line.</p>
```
:::

`data-tone` picks from the same semantic pairs the admonitions use, so a badge and a warning agree about what a warning looks like. The tones are `info`, `success`, `warn` and `danger`.

::: compare
```crv
Status: [beta]{.badge}, [stable]{.badge data-tone=success}, [removed]{.badge data-tone=danger}.
```

```html
<p>Status: <span class="badge">beta</span>, <span class="badge" data-tone="success">stable</span>, <span class="badge" data-tone="danger">removed</span>.</p>
```
:::

Keep the status word in the source, and leave only color and spacing to CSS.

## Table modifiers

Attributes on the line above a table reach the `<table>`, and attributes after a row's closing pipe reach its `<tr>`. Between them they cover most of what people install a table plugin for: `striped`, `compact` and `sticky-head` on the table, and `ok`, `warn` and `fail` on a row.

::: compare
```crv
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

A single cell takes attributes in its brace prefix, the same place that holds its alignment. `{.ok}` written after the space, inside the cell text, is literal text, not a class.

::: compare
```crv
|= Item |={>} Price |
| Apples |{.num} 1.20 |
```

```html
<table>
  <thead>
    <tr><th scope="col">Item</th><th scope="col" style="text-align: right;">Price</th></tr>
  </thead>
  <tbody>
    <tr><td>Apples</td><td class="num" style="text-align: right;">1.20</td></tr>
  </tbody>
</table>
```
:::

Header and span semantics come from the cell marks, not from a class. A table too wide for the page goes inside `::: scroll`, which scrolls the table sideways instead of the page:

:::: compare
```crv
::: scroll
|= Engine |= Language |= Parse |= Render |= Format |= Lint |= Import |
| carve-js | TypeScript | yes | yes | yes | yes | yes |
:::
```

```html
<div class="scroll">
  <table>
    <thead>
      <tr><th scope="col">Engine</th><th scope="col">Language</th><th scope="col">Parse</th><th scope="col">Render</th><th scope="col">Format</th><th scope="col">Lint</th><th scope="col">Import</th></tr>
    </thead>
    <tbody>
      <tr><td>carve-js</td><td>TypeScript</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td></tr>
    </tbody>
  </table>
</div>
```
::::

## Scrolling code blocks

A long listing pushes the rest of the page out of view. `{.scroll}` on the line above a code fence, a captioned fence or a code include bounds the `<pre>` at 25 lines and scrolls it on both axes. A caption stays in view because only the `<pre>` scrolls, and the block prints at full height.

::: compare
````crv
{.scroll style="--carve-scroll-lines: 4"}
```js
const first = 1;
const second = 2;
const third = 3;
const fourth = 4;
const fifth = 5;
const sixth = 6;
```
````

```html
<pre class="scroll" style="--carve-scroll-lines: 4"><code class="language-js">const first = 1;
const second = 2;
const third = 3;
const fourth = 4;
const fifth = 5;
const sixth = 6;
</code></pre>
```
:::

Two custom properties tune the height. Set them on the block with a `style` attribute, as above, or on a wrapper to change every block inside it:

| Property | Default | Effect |
| --- | --- | --- |
| `--carve-scroll-lines` | `25` | visible lines of the block |
| `--carve-scroll-max-height` | unset | a length that replaces the line count |

The same class works on a code include, which pulls a file into the page as a listing:

```crv
{.scroll style="--carve-scroll-lines: 20"}
{{ src/server.js @code:js }}
```

For keyboard scrolling the `<pre>` must be focusable, which depends on the host adding `tabindex="0"`. Do not insert manual line breaks to make code fit a narrow page: they change the code.

## Page breaks

Put `{.page-break}` above a thematic break to mark a page break:

::: compare
```crv
Text of page one.

{.page-break}
***

Text of page two.
```

```html
<p>Text of page one.</p>
<hr class="page-break">
<p>Text of page two.</p>
```
:::

A print stylesheet can start a new page there and hide the rule:

```css
@media print { hr.page-break { break-after: page; border: 0; } }
```

On screen it stays a normal rule, so the break is still visible.

## Where CSS stops

CSS cannot hold state. Anything that has to remember whether it is open, or which of several things is selected, needs an element that carries that state, or a script.

| You want | CSS alone? | Reach for |
| --- | --- | --- |
| A branch that folds | no | `::: details` per branch, or a host renderer |
| Tabs | no | the [tabs extension](./extensions) |
| A copy button, search, sorting | no | your own page script |
| Syntax highlighting | no | any highlighter, on the `language-*` class |
| Highlighting particular code lines | no | a highlighter that writes per-line elements |

The first one needs no custom code either. `::: details` is a standard extension that the host turns on with a single registration; nest one per branch and the tree folds, with no JavaScript at all. The cost is in the source: each branch becomes a container, and every container around it needs a longer fence.

<!-- carve-example {"extensions":["details"]} -->
::::: compare
```crv
:::: tree
- ::: details "src/"
  - blocks.crv
  :::
- tests/
::::
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

Without the extension, each `::: details` stays a div with its title as a paragraph, so the tree still shows every branch, open.

## Why this is not syntax

Every recipe here could have been a construct in the language. None of them needs to be. Ordinary containers and attributes keep the document readable when the stylesheet is absent, and they let a project add its own visual conventions without inventing syntax.

That is also why these class names are a convention rather than a rule of the specification, and why the layer is a separate import: adding the stylesheet opts into the meaning that carve-css gives those words. A host that needs a new semantic node, not only a new look, uses an extension, which must keep a valid core fallback. See [Optional Features and Extensions](./extensions).

**Specification (external):** [block structure](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) (fences, divs and attribute lines; tables), [HTML output](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) (quotes, divs and page breaks) and [extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md).
