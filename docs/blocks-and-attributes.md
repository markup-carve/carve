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

Put the attribute block on the line directly above it (no blank line in between):

```carve
{#install .featured}
## Setup

{.callout}
::: note
Read this first.
:::
```

renders the heading as `<h2 id="install" class="featured">` and the admonition as `<aside class="admonition note callout">`.

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
- `boolean` - a bare word becomes a value-less attribute

## Special cases (the outliers)

A few elements don't follow the plain block rule, because the plain rule can't express what they need. These are the only exceptions - learn them once.

### List items - attributes go after the marker

A `{…}` on the line before a list attaches to the **list**, not to an item. To attribute an individual `<li>` you put the attribute block **right after the marker**:

```carve
- {#first .done} finished item
- ordinary item
```

This is a Carve addition (djot cannot attribute list items at all) and is the **only** way to target the `<li>` element itself. The marker's space still follows the attribute block (`- {…} text`).

### Code fences - leading line only

A code fence's opening line is its **info string** (the language). An attribute block there would be parsed as part of that string, so code-block attributes must go on the **preceding** line:

```carve
{.numbered #snippet}
``` js
const x = 1;
```
```

A `{…}` after the language word does **not** attach - it is treated as info-string content.

### `:::` openers - type word vs class

A `:::` opener is steered by a bare **type word**, not by a class:

- `::: note` → an admonition (`<aside class="admonition note">`) for the eight canonical types; any other word → a generic `<div class="word">`.
- For a purely presentational container, use the type-less form with a **preceding** attribute line:

  ```carve
  {.sidebar #s}
  :::
  Aside content.
  :::
  ```

See [Examples → Admonitions](/examples#admonitions) for the recognized type words.

## Quick reference

```carve
{#id .class}          ← block: line BEFORE the block
# Heading

text [span]{.c}       ← inline: directly AFTER, no space

- {#item} list item   ← list item: after the marker

{.x}                  ← code block: line BEFORE the fence
``` lang
code
```
```
