# Snippets

Carve 0.2 lets you name a short piece of inline text once and repeat it anywhere in the document. Define it on one line with `{$name}:` and use it with <code v-pre>{{ $name }}</code>.

````carve
{$ver}: 0.2.3

{$rel .badge}: [release notes](https://github.com/markup-carve/carve/releases/v0.2.3)

Install {{ $ver }} today. Read the {{ $rel }}.

{{ $rel }}
````

```html
<p>Install 0.2.3 today. Read the <span class="badge"><a href="https://github.com/markup-carve/carve/releases/v0.2.3">release notes</a></span>.</p>
<p class="badge"><a href="https://github.com/markup-carve/carve/releases/v0.2.3">release notes</a></p>
```

## Define

A definition is one line at column 0, outside every list, quote and div: `{$`, a name, `}:`, one space and the value. The name starts with an ASCII letter, digit or `_` and continues with letters, digits, `_` and `-`. The value is inline Carve, parsed once; the next line never continues it. A definition renders nothing.

Attributes go in the marker or in glued blocks, and land on the copy: `{$rel .badge}:` and `{$rel}{.badge}:` are the same. A definition takes no id, since it is not an anchor: `{$v #x}: a` stays text and lint reports `snippet-definition-id`.

The first definition of a name wins. A later one reports `duplicate-snippet`. Snippet names never mix with ids: `{$intro}:` and a heading with the id `intro` coexist, and `</#intro>` still links to the heading.

## Use

<code v-pre>{{ $name }}</code> inside a sentence copies the value in place. Alone on its own line, after a blank line, it becomes its own paragraph. On a line that continues an open paragraph it stays inline. In a table cell a use is always inline.

A use may stand before its definition, and a definition may use another snippet. A use that cannot be expanded is written as its own text <code v-pre>{{ $name }}</code> and reported: `snippet-unresolved` for an unknown name, `snippet-cycle` for a snippet that reaches itself, `snippet-depth` past 16 nested snippets and `snippet-node-budget` past 100,000 copied nodes.

To write the text <code v-pre>{{ $name }}</code> literally, escape the first brace: <code v-pre>\{{ $name }}</code>. <code v-pre>{{$name}}</code> with no spaces, or with an option such as `@shift:1`, is no use.

## Includes and footnotes

Uses and definitions work across [included files](/include-files). An include that selects part of a file still brings that file's snippet definitions, and a link or footnote reference in a snippet resolves against the file the snippet was defined in. A footnote reference used twice through a snippet gives two reference marks for one note.

## Lint

`unused-snippet` reports, as a hint, a definition no use names. `definition-in-container` reports a definition line inside a list, quote or div, which stays text.

<code v-pre>{{ #id }}</code>, with `#` in place of `$`, is reserved: it renders as text and lint reports `reserved-syntax`.

## Round trip

With the render option `roundtrip`, each copy carries `data-carve-snippet` and the definitions are written into a `<template data-carve-snippets>`. Importing that HTML gives back the definitions and the uses rather than the copied text.

[Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#definitions) defines the definition line, [the includes document](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md#snippets) the expansion and its limits, and [the HTML document](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#roundtrip-carriers) the carriers.
