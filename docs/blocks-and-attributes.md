# Block & inline elements (and attributes)

Carve has two kinds of element, and **attributes attach to each kind in a different place**. Getting this one rule right removes almost all attribute confusion.

| Kind | Attribute placement |
|------|---------------------|
| **Block** element | a `{…}` block on the line **immediately before** it |
| **Inline** element | a `{…}` block **immediately after** it, with **no** space |

This mirrors djot: block attributes lead the block; inline attributes trail the span. Carve keeps that rule uniform - there is no "trailing attribute" on a block line.

## Block elements

A block owns a rectangle of the document: it starts on its own line and is separated from its neighbors by structure (a blank line, a marker, a fence).

- Paragraph
- Heading - `# … ###### …`
- Block quote - `> …`
- List (bullet `-` / `*`, ordered `1.` / `1)`, task `- [ ]`) and its list items
- Code block (fenced) - ` ``` `
- Generic div / admonition / line-block / local hard-break block - `::: …`
- Table
- Thematic break - `---`
- Frontmatter - leading `---` block
- Fenced comment - `%%%`

### Attributing a block

Put the attribute block on a line above it (it floats forward across blank lines to the next block, matching djot - PART 9 §15):

```carve
{#install .featured}
## Setup

{.callout}
::: note
Read this first.
:::
```

renders the heading as `<h2 class="featured">` inside `<section id="install">` (an explicit heading id hoists to the `<section>` wrapper, PART 9 §13) and the admonition as `<aside class="admonition note callout">`.

This is uniform across every block - headings, block quotes, lists, code blocks, divs/admonitions, line-blocks, local hard-break blocks, tables. They all take their attributes on the preceding line; none take a trailing attribute on the block's own line. (For a code block the fence line accepts only structured metadata - `lang`, optional `"header"`, optional `[label]`, in that order. A `:::` container fence takes the same two metadata tokens after its type word - see [Container fences: titles and labels](#container-fences-titles-and-labels) below. A trailing `{…}` after the language word makes the line *not a fence at all*; the backticks then fall back to ordinary inline parsing. For a heading, a trailing `{…}` is ordinary inline text. Put the attributes on the line above, like any other block.)

### Code blocks: line numbers, titles, and highlighting

Because a code block takes its attributes on the preceding line, those attributes flow straight onto the rendered `<pre>`. A renderer can use them to switch on line numbers or set other presentation hooks. The fence line has only the structured code metadata: language, optional quoted header, optional bracketed label.

````carve
{.line-numbers data-line-start="42"}
```php "src/app.php" [Backend]
$x = compute();
return $x;
```
````

- `.line-numbers` asks the renderer for a line-number gutter.
- `data-line-start="42"` (a plain `data-*` attribute) starts numbering at 42.
- `"src/app.php"` is the code-block header; core carries it as `title` on the `<pre>`, and renderers typically surface it as a caption.
- `[Backend]` is a grouping label; core ignores it, while a code-group extension can use it as the tab name.

If the preceding attribute line also sets `title="…"`, that explicit attribute wins over the quoted opener header:

````carve
{title="shown title"}
```php "fallback title"
echo "ok";
```
````

How *highlighting*, *diff*, and *focus* are expressed is a renderer concern, not Carve syntax. Renderers built on Torchlight read in-code annotations, so the signal lives in the code body and the fence metadata stays limited to `lang "header" [label]`:

````carve
```php
$safe = clean($in);   // [tl! highlight]
$old  = legacy();     // [tl! --]
$new  = modern();     // [tl! ++]
```
````

### Container fences: titles and labels

A `:::` fence line takes the same two metadata tokens as a code fence, after the type word and in the same fixed order: an optional quoted `"header"` and an optional bracketed `[label]`. This is the one-line way to title an admonition or name a tab panel:

```carve
::: note "Custom Title"
The quoted header becomes <p class="admonition-title">.
:::

:::: tabs
::: tab [Overview]
The [label] is the tab name (canonical; the older {label="…"} attribute
and inner-heading conventions stay supported but are deprecated).
:::
::::

::: tip "Pro Tip" [Build]
Header and label together - header first, label second.
:::
```

Two strictness rules to know:

- The header must use **straight double quotes**. An unquoted trailing word (`::: note Custom Title`) or typographic quotes (`::: note “Custom”`, the kind word processors and CMS text filters substitute) make the line *not a fence at all* - the whole block degrades to a literal paragraph. If you see raw `:::` lines in your output, check the quotes first.
- The quoted opener header is the only thing that produces the visible `<p class="admonition-title">`. A `title="…"` key on the preceding attribute line is an ordinary HTML `title` attribute (a hover tooltip) like on any block - a different channel, not a fallback spelling.

#### Title vs. label - which one do I want?

Both tokens can end up visible, so the distinction is *role*, not visibility:

| | `"Title"` (header) | `[Label]` (grouping id) |
|---|---|---|
| Role | caption **of** the block's content | name **for** the block among siblings |
| Standalone block | `<p class="admonition-title">` heading line | `<p class="div-label">` caption (the graceful-degradation floor - authored text never vanishes) |
| tabs / code-group active | stays **inside** the panel | moves **out** to the tab button; the fallback caption disappears |
| details extension | becomes the `<summary>` | ignored (details has no group to name) |

Rules of thumb: a standalone admonition wants quotes; a panel in a group wants brackets; use both to have a named tab whose panel also carries a visible heading (`::: tab "Install on Linux" [Linux]`). A title never feeds the tab name - if a tab has no `[label]`, the name falls back to the deprecated `{label="…"}` attribute or first inner heading, then to `Tab N`.

## Inline elements

An inline element lives inside a line of text.

- Emphasis `/…/`, strong `*…*`, underline `_…_`
- Strikethrough `~…~`, highlight `=…=`, subscript `{,…,}`, superscript `{^…^}`
- Inline code - `` `…` ``
- Link `[…](…)`, reference link `[…][…]`, image `![…](…)`
- Span `[…]{…}`, autolink `<…>`, footnote reference `[^…]`
- Math, `:symbol:`, `@mention`, `#tag`

### Attributing an inline

Append the attribute block directly, with no space:

```carve
A [keyword]{.term #kw} and *bold text*{.lead} and `code`{.lang-js}.
```

A space before the `{…}` breaks the attachment - the braces are then literal text.

## Attribute syntax

The same `{…}` block is used in both positions:

```carve
{#the-id .class-a .class-b key="value" boolean}
```

- `#id` - element id (one per element)
- `.class` - add a class (repeatable)
- `key=value` / `key="value"` - arbitrary attribute; quote when the value has spaces
- `boolean` - a bare word (no `#`/`.`/`=`) becomes a value-less attribute, rendered `name=""` (e.g. `[Tab]{kbd}` → `<span kbd="">Tab</span>`)

## The one outlier: list items

Every block takes its attributes on the preceding line and every inline takes them trailing - with a single exception: a list item's attribute block **abuts its marker**.

A `{…}` on the line before a list attaches to the **list**, not to an item. To attribute an individual `<li>` the attribute block must **abut the marker with no space** (`-{…}`), and the marker's required space follows it:

```carve
-{#first .done} finished item
- ordinary item
```

**Whitespace is the discriminator** (normative):

- `-{.c} text` - the `{.c}` abuts the marker, so it is part of the marker and attributes the `<li>` -> `<li class="c">text</li>`.
- `- {.c} text` - a space before `{`, so the `{.c}` is ordinary item **content** (literal), not a li-attribute -> `<li>{.c} text</li>`.

This is a Carve addition (djot cannot attribute list items at all) and is the **only** way to target the `<li>` element itself. For task items the block abuts the marker before the checkbox: `-{.c} [ ] text`.

(Aside: the `:::` *type word* that picks an admonition vs a generic div - e.g. `::: note` - is about block type, not attributes; a div takes its attributes on the preceding line like any block. See [Examples → Admonitions](/examples/extensions#admonitions).)

## Quick reference

````carve
{#id .class}          ← block: line BEFORE the block
# Heading

text [span]{.c}       ← inline: directly AFTER, no space

-{#item} list item    ← list item: abuts the marker (no space!)

{.x}                  ← code block: line BEFORE the fence
```lang
code
```
````
