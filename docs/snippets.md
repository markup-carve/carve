---
description: "Named inline snippets in Carve 0.2: define a short piece of text once with {$name}: and repeat it anywhere, with the expansion rules, AST nodes, fmt and lint behavior, and common mistakes."
---

# Snippets

Carve 0.2 lets you name a short piece of inline text once and repeat it anywhere in the document. Define it on one line with `{$name}:` and use it with <code v-pre>{{ $name }}</code>.

Use a snippet for text that must stay the same everywhere it appears and may change later: a version number, a product name with its formatting, a support address, a link you cite in several places. Change the definition and every copy follows. For a whole paragraph or section from another file, use an [include](./include-files) instead.

::: compare
```crv
{$ver}: 0.2.0

{$rel .badge}: [0.2 overview](https://github.com/markup-carve/carve/blob/main/docs/whats-new-0-2.md)

Install {{ $ver }} today. Read the {{ $rel }}.

{{ $rel }}
```

```html
<p>Install 0.2.0 today. Read the <span class="badge"><a href="https://github.com/markup-carve/carve/blob/main/docs/whats-new-0-2.md">0.2 overview</a></span>.</p>
<p class="badge"><a href="https://github.com/markup-carve/carve/blob/main/docs/whats-new-0-2.md">0.2 overview</a></p>
```
:::

## Define

A definition is one line at column 0, outside every list, quote and div. Write it in this order:

1. `{$` and the name. The name starts with an ASCII letter, digit or `_` and continues with letters, digits, `_` and `-`.
2. Optionally, a space and attribute parts such as `.badge` or `key=value`.
3. `}:`, one space, and the value.

The value is inline Carve, parsed once; the next line never continues it. A definition renders nothing.

Attributes go in the marker or in glued blocks, and land on the copy: `{$rel .badge}:` and `{$rel}{.badge}:` are the same. An attribute line directly above the definition adds its attributes first. A definition takes no id, since it is not an anchor: `{$v #x}: a` stays text and lint reports `snippet-definition-id`.

The first definition of a name wins. A later one stays in the tree, renders nothing, and reports `duplicate-snippet`.

## Use

<code v-pre>{{ $name }}</code> inside a sentence copies the value in place. Alone on its own line, after a blank line, it becomes its own paragraph. On a line that continues an open paragraph it stays inline. In a table cell a use is always inline. Uses also work in headings and list items:

::: compare
```crv
{$name}: Carve

{$product}: *{{ $name }}* 0.2

= About {{ $product }}

|= Tool |= Version |
| {{ $name }} | 0.2 |

- In a list item:

  {{ $product }}
```

```html
<section id="About-Carve-0-2">
  <h1>About <strong>Carve</strong> 0.2</h1>
  <table>
    <thead>
      <tr><th scope="col">Tool</th><th scope="col">Version</th></tr>
    </thead>
    <tbody>
      <tr><td>Carve</td><td>0.2</td></tr>
    </tbody>
  </table>
  <ul>
    <li>In a list item:
      <p><strong>Carve</strong> 0.2</p>
    </li>
  </ul>
</section>
```
:::

The heading id is built from the expanded text, so it is `About-Carve-0-2`. An inline copy of a definition with attributes gets a `<span>` around it; a block use puts the attributes on its paragraph, as `.badge` shows in the first example.

A use on the line right after a paragraph line is a lazy line of that paragraph, so the copy joins the paragraph instead of starting a new one:

::: compare
```crv
A paragraph that goes on
{{ $v }}

{$v}: copy
```

```html
<p>A paragraph that goes on
copy</p>
```
:::

A use may stand before its definition, as here, and a definition may use another snippet, as `$product` uses `$name` above.

To write the text <code v-pre>{{ $name }}</code> literally, escape the first brace: <code v-pre>\{{ $name }}</code>. <code v-pre>{{$name}}</code> with no spaces, or with an option such as `@shift:1`, is no use. A use is never read inside code, math, raw or literal spans, comments, link destinations, attribute values or include paths.

## Names and ids

Snippet names have their own namespace and are never compared with ids. `{$intro}:` and a heading with the id `Intro` coexist, and a cross-reference still finds the heading:

::: compare
```crv
{$intro}: Welcome

= Intro

{{ $intro }}, see </#Intro>.
```

```html
<section id="Intro">
  <h1>Intro</h1>
  <p>Welcome, see <a href="#Intro">Intro</a>.</p>
</section>
```
:::

A cross-reference to a name that only a snippet carries finds nothing, as for any missing id.

## Includes and footnotes

Uses and definitions work across [included files](./include-files): lookup is global over the expanded document, so a definition in one file serves a use in another. An include that selects part of a file still brings that file's snippet definitions, and a link or footnote reference in a snippet resolves against the file the snippet was defined in. A footnote reference used twice through a snippet gives two reference marks for one note.

## Limits

A use that cannot be expanded is written as its own text, <code v-pre>{{ $name }}</code>, and reported when rendering:

| Code | When |
|------|------|
| `snippet-unresolved` | no definition has this name |
| `snippet-cycle` | the snippet reaches itself, directly or through other snippets |
| `snippet-depth` | more than 16 snippets are nested |
| `snippet-node-budget` | the copies would add more than 100,000 nodes to the render |

All four are warnings on the render channel (`carve render` prints them to stderr), not lint findings. A failed use costs nothing, so a later, smaller use may still fit the budget.

## In the AST

A definition is a `snippet_definition` node among the top-level children, with `name` (without the `$`), `children` (its inline value) and optional `attrs`. A use is a `snippet_use` node with `name` and `mode`, `inline` or `block`, and nothing else. The parsed tree keeps the uses; the copies exist only in the render. `npx carve ast` on a two-line document gives (positions removed):

```crv
{$ver}: 0.2.0

Install {{ $ver }} today.
```

```json
[
  {"type": "snippet_definition", "name": "ver", "children": [{"type": "text", "value": "0.2.0"}]},
  {"type": "paragraph", "children": [
    {"type": "text", "value": "Install "},
    {"type": "snippet_use", "name": "ver", "mode": "inline"},
    {"type": "text", "value": " today."}
  ]}
]
```

The nodes of a copy carry no positions and no ids. A document transform sees the copies as ordinary nodes; a `snippet_use` that a transform inserts is not expanded and reports `snippet-unexpanded-transform`.

## How fmt writes it

`carve fmt` never expands a use. It writes a definition on one line as `{$`, the name, the attributes as one attribute block's parts, `}: ` and the value, so `{$rel}{.badge}: …` becomes `{$rel .badge}: …`. Definitions are separated by blank lines like other blocks. A use is written as <code v-pre>{{ $name }}</code>, alone on its line for a block use. Text that looks like a use but is not one gets its first brace escaped, so <code v-pre>{{$v}}</code> becomes <code v-pre>\{{$v}}</code>.

## Lint

| Code | Severity | When |
|------|----------|------|
| `snippet-definition-id` | warning | the marker holds an id, so the line is text |
| `duplicate-snippet` | warning | a second definition for a name |
| `definition-in-container` | warning | a definition line inside a list, quote or div, which stays text |
| `unused-snippet` | hint | a winning definition that no use names |
| `reserved-syntax` | warning | <code v-pre>{{ #id }}</code>, with `#` in place of `$`, which is reserved and renders as text |

## Round trip

With the render option `roundtrip`, each copy carries `data-carve-snippet` and the definitions are written into a `<template data-carve-snippets>`. Importing that HTML gives back the definitions and the uses rather than the copied text.

<!-- carve-example {"options":{"roundtrip":true}} -->
::: compare
```crv
{$ver}: 0.2.0

Install {{ $ver }} today.
```

```html
<template data-carve-snippets>{$ver}: 0.2.0</template>
<p>Install <span data-carve-snippet="1:inline:$ver">0.2.0</span> today.</p>
```
:::

`npx carve import --from html` on that output returns the two source lines above.

## Common mistakes

### An id on the definition

A snippet is no anchor. With an id the line is no definition, the marker renders as text, and every use stays unresolved:

<!-- carve-sample {"lint":"snippet-definition-id"} -->
::: compare
```crv
{$v #x}: a

Text.
```

```html
<p>{$v <span class="tag"><strong>#x</strong></span>}: a</p>
<p>Text.</p>
```
:::

Fix: drop the id. Use a class or key-value attribute if the copy needs a hook.

### A definition inside a list

Definitions stand only at column 0 outside every container. Inside a list item the line is text, and the use finds no definition:

<!-- carve-sample {"lint":"definition-in-container"} -->
::: compare
```crv
- {$v}: a

{{ $v }}
```

```html
<ul>
  <li>{$v}: a</li>
</ul>
<p>{{ $v }}</p>
```
:::

`carve render` also warns `snippet-unresolved` for the use.

### Defining a name twice

The first definition wins. The second one renders nothing and is reported:

<!-- carve-sample {"lint":"duplicate-snippet"} -->
::: compare
```crv
{$a}: one

{$a}: two

{{ $a }}
```

```html
<p>one</p>
```
:::

### A misspelled or missing name

Lint does not check uses against definitions. The render writes the use as text and warns `snippet-unresolved` on stderr:

::: compare
```crv
Text {{ $missing }} here.
```

```html
<p>Text {{ $missing }} here.</p>
```
:::

### A snippet that uses itself

The cycle is caught before the depth limit. The inner use is written as text and the render warns `snippet-cycle`:

::: compare
```crv
{$loop}: x {{ $loop }}

{{ $loop }}
```

```html
<p>x {{ $loop }}</p>
```
:::

### Attributes after a use

A use takes no attributes. A block glued to it is text, and lint hints that it is attached to nothing:

<!-- carve-sample {"lint":"unattached-inline-attribute: a use takes no attributes"} -->
::: compare
```crv
Version {{ $v }}{.c} here.

{$v}: 0.2
```

```html
<p>Version 0.2{.c} here.</p>
```
:::

Fix: put the attributes on the definition, `{$v .c}: 0.2`.

### A value on the next line

The value must follow `}: ` on the same line. `{$v}:` with nothing after it makes no definition, and there is no finding:

::: compare
```crv
{$v}:
0.2

Text.
```

```html
<p>{$v}:
0.2</p>
<p>Text.</p>
```
:::

**Specification (external):** [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#definitions) defines the definition line and the block use (C2-B-236, C2-B-237), [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) the inline use (C2-I-128), [Includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md#snippets) the expansion and its limits (C2-N-090 to C2-N-096), [AST](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md) the nodes (C2-A-220, C2-A-221), [Writer and lint](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md) the writing (C2-W-159) and the findings, and [HTML output](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#roundtrip-carriers) the carriers.
