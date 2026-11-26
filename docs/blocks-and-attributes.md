---
description: Where an attribute attaches on a block versus an inline element, and why the two differ.
---

# Blocks and Attributes

Blocks organize a Carve 0.2 document. An attribute line gives the next eligible block an id, classes, or other keys. The exact attachment and container rules are in the [block chapter](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#attribute-lines); [HTML rendering](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#attributes) decides which keys appear in output.

## Start blocks

```crv
= Heading

A paragraph with /emphasis/.

> Quoted paragraph.

- First item
- Second item

::: note "Remember"
A paragraph inside an admonition.
:::
```

A heading or quote line after an open paragraph can become paragraph text. Put a blank line before it. A list item needs content on its marker line. A list is loose only when a blank line separates two of its items; `{loose}` no longer changes tightness.

## Attribute placement

```crv
{.notice}
A paragraph with a class.
```

For a heading, place an attribute line such as `{#overview .lead}` directly above it.

An attribute line immediately above its block can attach. A blank line between them prevents attachment. A brace block after inline content can attribute that inline node when the inline rules allow it. See [attribute blocks](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md#attribute-blocks).

## A block with its attribute line and caption

```crv
{#harbor .wide}
![Boats in the harbor](harbor.jpg)
^ The harbor at dawn.
```

The attribute line, the image and the caption line belong together, so no blank line stands between them. The three lines make one `<figure>`: the image goes inside it, the caption becomes its `<figcaption>`, and the id and class sit on the figure.

```html
<figure id="harbor" class="wide">
  <img src="harbor.jpg" alt="Boats in the harbor">
  <figcaption>The harbor at dawn.</figcaption>
</figure>
```

A caption attaches to an image, a table, a code block, a quote, a math block or a figure group. On a quote it names the source:

```crv
> Measure twice, cut once.
^ A carpenter's proverb
```

A blank line breaks the group apart. An attribute line with a blank line below it attaches to nothing, and a caption line after a blank line has no block above it. Both then render as paragraph text, so `{#harbor .wide}` and `^ The harbor at dawn.` show up in the page. `carve lint` reports them as `unattached-block-attribute` and `unattached-caption`. See [captions](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#captions) and [attribute lines](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#attribute-lines).

## Fences and raw content

A backtick fence makes a code block. A colon fence makes a container. A raw fence, such as `` ```=html ``, is explicit and requires the host to allow raw HTML for HTML output. Unclosed fences remain fences and produce a diagnostic. See [fences](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#fences-divs-and-comment-blocks) and [raw HTML options](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).

## Code block line options

Line numbers and highlighted lines are attributes on the line above the fence. Carve has no syntax for them: a range in the info string, as in `` ```js {1,3} ``, is reported as `fence-title-syntax` and dropped.

````crv
{.line-numbers data-line-start=42 data-highlight=1,3-5}
```php "src/app.php"
$a = 1;
$b = 2;
```
````

```html
<pre title="src/app.php" class="line-numbers" data-line-start="42" data-highlight="1,3-5"><code class="language-php">$a = 1;
$b = 2;
</code></pre>
```

- `.line-numbers` asks for a line-number gutter.
- `data-line-start` is the number of the first line, for an excerpt from a larger file. It is a decimal number of at least 1 without a leading zero; the gutter starts at 1 without it.
- `data-highlight` lists the lines to highlight: line numbers and `a-b` ranges, separated by commas without spaces. The lines are counted from the first line of the block, not from `data-line-start`.

The renderer writes these keys as it writes any attribute, and does not check them. A host or highlighter reads them from the `<pre>`. On a block with a caption they stay on the `<pre>`, while its other attributes go on the `<figure>` around it. `fmt` and the HTML importer keep them. See [line options](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#code-and-raw-content) (C2-H-063, C2-H-211 to C2-H-213).

A code include does not set the start for you. With `@lines:4-5`, write the first selected line yourself:

```crv
{.line-numbers data-line-start=4}
{{ src/server.js @code:js @lines:4-5 }}
```

`data-line-start=auto` is not a value: it is written to the `<pre>` as the text `auto`, and a host starts the gutter at 1.

Common highlighters name these options differently. A host adapter maps them:

| Highlighter | Reads |
| --- | --- |
| Prism | `data-start` and `data-line` on `<pre>` |
| reveal.js | `data-line-numbers` on `<code>` |
| Pygments, pymdownx | `linenums` and `hl_lines` |
| Torchlight | `lineNumbersStart` |
| Shiki | a transformer that reads the node's `attrs` |

A host that highlights through `codeBlockRenderer` finds them in the node's `attrs`, also for a block with a caption (C2-H-206).

## Tables

```crv
|= Item |={>} Count |
| Apples | 3 |
| Pears | 4 |
```

Header cells carry `|=`. Alignment and other cell attributes use a brace prefix after the pipe marker. See [table rules](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#tables).

## Keeping line breaks

The `::: |` sigil div is a line block: each source line stays a line, with `<br>` between lines of a stanza. The `::: \` form is a hard-break block whose body still parses as blocks. Use the [sigil div rules](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#sigil-divs) when line structure matters.

## Semantic spans: kbd, abbr, time

A span with the lower-case key `kbd`, `abbr`, or `time` renders with that HTML element. `abbr` can supply a title and `time` a datetime value. Key case matters here. See [inline HTML elements](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#inline-elements).

## Consumed structural keys

Some keys affect the tree or HTML structure instead of passing through as ordinary attributes. For example, a valid `start` on an ordered list sets its starting number, while an authored `align` on a paragraph can produce CSS text alignment. The [block](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#ordered-lists) and [HTML](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#attributes) chapters define each key at its owner.
