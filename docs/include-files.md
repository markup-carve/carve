---
title: Include files
description: Split a long Carve document into several files and bring them together with the include directive, on the command line or through a host resolver.
---

# Include Files

Use an include when a long document is easier to maintain as several files.
Write the path in double braces on a line of its own:

<!-- carve-sample {"lint":"the handbook chapters are illustrative paths, so the sample root reports include-not-found"} -->
```crv
= Handbook

{{ chapters/introduction.crv }}

{{ chapters/setup.crv }}
```

Each included file is parsed as a document of its own, and its blocks take the
place of the directive. `chapter-2.crv` holds `= Chapter Two` and a paragraph:

::: compare
```crv
Intro paragraph.

{{ chapter-2.crv }}
```

```html
<p>Intro paragraph.</p>
<section id="Chapter-Two">
  <h1>Chapter Two</h1>
  <p>Text of the chapter.</p>
</section>
```
:::

An include is a block. A directive inside a sentence, a heading or a table cell
is plain text, and so is one inside code.

## Paths and the include root

The path is relative to the file that holds the directive. A path with spaces
goes in double quotes: <code v-pre>{{ "my chapter.crv" }}</code>.

When the Carve CLI renders a file, included files must stay inside the folder
of the input file. Set another containment root with `--include-root`, for
example to let a chapter reach a sibling folder:

```sh
carve render handbook.crv > handbook.html
carve render --include-root . book/handbook.crv > handbook.html
```

`render`, `ast`, `lint` and `diagnostics` expand includes by default. Use
`--no-includes` to keep the directives unexpanded. A document read from
standard input has no folder, so its includes expand only when you name a root
with `--include-root`. `fmt` never expands: it keeps each include line as
written.

## Select part of a file

You can include one section by its id, a range of lines, or a named region:

<!-- carve-sample {"lint":"the setup chapter and the readme are illustrative paths, so the sample root reports include-not-found"} -->
```crv
{{ chapters/setup.crv #Install }}

{{ notes.crv @lines:10-24 }}

{{ readme.crv @region:requirements }}
```

A section is a heading and the blocks under it, up to the next heading of the
same or a higher level, or a single block with that id. `recipes.crv` holds a
heading and a code block with the id `dough`:

::: compare
```crv
{{ recipes.crv #dough }}
```

```html
<pre id="dough"><code class="language-text">500 g flour
325 g water
</code></pre>
```
:::

A region in a Carve file is marked with two line comments, which render
nothing:

```crv
%% #region requirements

- PHP 8.3 or later
- Composer 2.7

%% #endregion requirements
```

Add `@shift:1` to move every included heading one level down, or
`@shift:auto` to place the included headings one level below the heading the
directive stands under.

## Show a source file as code

`@code:lang` includes a file as one code block instead of reading it as Carve.
Combine it with `@lines` or `@region` to show only the part you need. Editors'
folding comments such as `// #region start` mark a region in source code:

::: compare
```crv
{{ src/server.js @code:js @region:start }}
```

```html
<pre><code class="language-js">const server = http.createServer(handler)
server.listen(3000)
</code></pre>
```
:::

An attribute line above the directive and a caption line below it apply to the
code block, as on an authored fence. A CSV or TSV file under `{table}` becomes
a table, and `@rows` and `@cols` pick records and columns from it.

A long code include can scroll with host CSS, see
[Scrolling code blocks](./recipes#scrolling-code-blocks). Selecting the part
you need with `@lines` or `@region` is usually better than scrolling the whole
file.

## Check the included files

File inclusion is a processor feature. A parse without a resolver leaves each
directive unexpanded and renders it as text; the browser Playground cannot read
local files. Run lint on the entry file to check the included files too:

```sh
carve lint --include-root . handbook.crv
```

It reports missing paths, paths outside the root, cycles, bad selections and
the findings inside the included files, each with the file and line where it
stands.

## Flatten a book

To turn a document into one file, run:

```sh
carve flatten handbook.crv > handbook-all.crv
```

It writes Carve source with every include expanded, so the result needs no
resolver. It writes nothing and fails when an include does not resolve, or when
the flattened file would render differently, as when two included files define
the same footnote or link reference key.

## Moving files

When a source file moves, check its relative paths, the section ids its
includes name, and the region names they select. A failed include is reported
and rendered as the directive text; it is never mistaken for included content.

For the full rules, selection options, path containment, limits, and what a
host must do to read files safely, see [File inclusion](./includes).

**Specification (external):** [Includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md), clauses C2-N-001 to C2-N-096; [Tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md), clauses C2-T-018 and C2-T-047 (command-line flags and `flatten`).
