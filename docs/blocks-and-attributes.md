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
- Generic div / admonition / line-block - `::: …`
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

This is uniform across every block - headings, block quotes, lists, code blocks, divs/admonitions, line-blocks, tables. They all take their attributes on the preceding line; none take a trailing attribute on the block's own line. (For a code block the fence line accepts only `lang [label]` - a `{…}` after the language word makes the line *not a fence at all*; the backticks then fall back to ordinary inline parsing. For a heading, a trailing `{…}` is ordinary inline text. Put the attributes on the line above, like any other block.)

## Inline elements

An inline element lives inside a line of text.

- Emphasis `/…/`, strong `*…*`, underline `_…_`
- Strikethrough `~…~`, highlight `=…=`, subscript `,…,`, superscript `^…^`
- Inline code - `` `…` ``
- Link `[…](…)`, reference link `[…][…]`, image `![…](…)`
- Span `[…]{…}`, autolink `<…>`, footnote reference `[^…]`
- Math, `:emoji:`, `@mention`, `#tag`

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

(Aside: the `:::` *type word* that picks an admonition vs a generic div - e.g. `::: note` - is about block type, not attributes; a div takes its attributes on the preceding line like any block. See [Examples → Admonitions](/examples#admonitions).)

## Quick reference

````carve
{#id .class}          ← block: line BEFORE the block
# Heading

text [span]{.c}       ← inline: directly AFTER, no space

-{#item} list item    ← list item: abuts the marker (no space!)

{.x}                  ← code block: line BEFORE the fence
``` lang
code
```
````
