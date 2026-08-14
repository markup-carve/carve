---
description: Where an attribute attaches on a block versus an inline element, and why the two differ.
---

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

renders the heading as `<h2 class="featured">` inside `<section id="install">` and the admonition as `<aside class="admonition note callout">`.

The split in that first line is the rule, not a quirk of this example: on a top-level heading the **id** hoists to the `<section>` wrapper and **every other attribute stays on the `<h*>`** (PART 9 §13). It makes no difference whether the id was written as `{#install}` or slugged from the heading text - both hoist. The id names the region a `#fragment` URL targets, and that region is the section; `.featured` describes the heading the author wrote it on, so a subtree-wide class belongs on a div instead. A heading inside a container (blockquote, div, list item) gets no wrapper at all, so there its id stays on the `<h*>` with the rest.

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

- `.line-numbers` asks the renderer for a line-number gutter; numbering is 1-based (line 1 first), matching editors, diffs, and compiler/linter line references.
- `data-line-start="42"` (a plain `data-*` attribute) overrides the start, so the gutter begins at 42 instead of 1 - useful for excerpts lifted from a larger file.
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
- Inline code - `` `…` ``, inline literal - `` !`…` `` (verbatim text, no code styling)
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
- `boolean` - a bare word (no `#`/`.`/`=`) becomes a value-less attribute, rendered `name=""` (e.g. `{.note open}` adds `open=""`). Three reserved names on inline spans instead select their HTML element (e.g. `[Tab]{kbd}` → `<kbd>Tab</kbd>`).
- `:tag` - the natural language of the content, short for `lang=tag` (see below)

### Language: `{:fr}`

`{:tag}` sets the language of what it attaches to. It is exact sugar for `lang=tag`, so it works anywhere an attribute block does and needs no extension:

```carve
The title is [Le Bon Usage]{:fr}.

{:de}
> Das ist ein deutschsprachiger Absatz.
```

```html
<p>The title is <span lang="fr">Le Bon Usage</span>.</p>
<blockquote lang="de"><p>Das ist ein deutschsprachiger Absatz.</p></blockquote>
```

Any BCP 47 tag works, including script, region and private-use subtags: `{:de-CH}`, `{:sr-Latn-RS}`, `{:x-acme}`. The tag is stored exactly as written, so its case is preserved.

The empty form `{:}` says the language is explicitly **unknown**, which is different from leaving the attribute off. Omitting it lets the content inherit the surrounding language; `{:}` stops that inheritance:

```carve
{:de}
> Der Titel ist [unbekannt]{:}.
```

::: tip Direction is separate
A language tag never sets writing direction. Direction follows the script, and a tag need not name one, so set it explicitly where it matters: `[…]{:ar dir=rtl}`. HTML's `dir="auto"` is available too.
:::

`:tag` and `lang=tag` are the same attribute, so writing both is just a repeated key - the last value wins:

```carve
[a]{:fr lang=de}   →   lang="de"
[b]{lang=de :fr}   →   lang="fr"
```

`carve fmt` writes the short spelling, so `{lang=fr}` is formatted to `{:fr}` and `{lang=""}` to `{:}`.

A tag that is not structurally well formed leaves the whole block as literal text rather than half-parsing it - `{:en_US}`, `{:-en}` and `{:français}` all stay visible in the output. And the sigil takes no padding: `{: fr}` (with a space) is the empty language attribute plus a separate boolean `fr`, not a language tag.

### Semantic spans: `{kbd}`, `{abbr="…"}`, `{time="…"}`

On an **inline span**, three attribute names are consumed and become the HTML element of the same name: `abbr`, `time`, `kbd`.

```carve
Press [Tab]{kbd} to indent.
```

```html
<p>Press <kbd>Tab</kbd> to indent.</p>
```

Two of them keep what you wrote: an `abbr` value becomes `title`, a `time` value becomes `datetime`. A value on `kbd` only picks the wrapper.

```carve
[HTML]{abbr="HyperText Markup Language"} shipped in [1993]{time="1993"}.
```

```html
<p><abbr title="HyperText Markup Language">HTML</abbr> shipped in <time datetime="1993">1993</time>.</p>
```

Several at once nest in a **fixed** order - `abbr`, `time`, `kbd`, innermost first - regardless of the order you typed them, so no document can come to depend on the spelling.

**Anything left over rides the outermost element.** A consumed name *renames* the span rather than wrapping it, so an id or class lands on the element you wrote it on:

```carve
[Tab]{#k .key kbd}
```

```html
<p><kbd id="k" class="key">Tab</kbd></p>
```

Three things worth knowing:

- **The span survives only when no name was consumed.** `[x]{onclick="…"}` is still `<span>x</span>` - hardening removes attributes, never the element you wrote. A semantic name is not a removed attribute; it never reaches the output as one.
- **The scope is exactly an ordinary span.** The same names on a code span, link, image or block-attribute line are ordinary attributes, so `` `c`{kbd} `` is `<code kbd="">c</code>`, not a `<kbd>`.
- **Only HTML changes.** The AST keeps an ordinary span carrying the authored attributes, plain-text and terminal output render the content, and `carve fmt` writes the span back out with its attributes - a value-less one bare, so `[Tab]{kbd}` formats to itself.

#### Why only three

A name is reserved only where Carve has no other **inline** spelling for that element, and only where it earns core: it carries data the author would otherwise lose (`abbr`, `time`), or it is ubiquitous enough that needing an opt-in would be absurd (`kbd`).

- `code` and `mark` are **nobody's**: `` `x` `` writes `<code>` and `=x=` writes `<mark>`.
- `samp`, `var`, `cite` and `dfn` are the [SemanticSpan extension](/extensions)'s - same spelling, same rules, off until a host enables it. Until then they stay ordinary attributes.
- An abbreviation definition (`*[HTML]: HyperText Markup Language`) also emits `<abbr>`, and that is a different mechanism rather than a second spelling: it expands every occurrence document-wide, where `[HTML]{abbr="…"}` marks one, with its own title, and can mark a term no definition declares.

The `:name[content]{attrs}` form has no core handler at all - `:kbd[Tab]` is `<span class="ext-kbd">Tab</span>` unless the extension is enabled, where it is accepted as a **soft-deprecated** spelling and slated for removal in 0.2.

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

[phrase]{:fr}         ← language: short for lang="fr"

[Tab]{kbd}            ← semantic span: <kbd>Tab</kbd>

-{#item} list item    ← list item: abuts the marker (no space!)

{.x}                  ← code block: line BEFORE the fence
```lang
code
```
````
