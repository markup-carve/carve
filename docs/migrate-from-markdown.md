---
title: Coming from Markdown
description: A task-oriented guide for Markdown and GFM authors switching to Carve.
---

# Coming from Markdown

Carve is a separate language. A Markdown file needs conversion and review before it becomes a `.crv` document. The 0.2 reference engine imports HTML; a Markdown pipeline can render Markdown to HTML and then use `carve import`. See the [HTML import contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md) and [Upgrading from 0.1](./upgrade-0-2) if the source is already Carve 0.1.

## Rewrite the visible syntax

| Markdown habit | Carve 0.2 source |
|---|---|
| `**strong**` | `*strong*` |
| `*emphasis*` | `/emphasis/` |
| `~~strike~~` | `{~strike~}` |
| `---` thematic break | `***` |
| GFM separator table | `|=` header cells |
| Tilde code fence | Backtick code fence |

Only a paragraph takes unindented lines. Every other block continues only on lines indented past its marker, except a fenced block, whose body runs to the closing fence. A line that repeats a marker, such as `>` or a table row, is read by that marker. A blank line ends every block but a fenced one; after it, only a list item, a description or a footnote goes on, and only with blocks indented to its content. A blank line before a new heading or quote avoids a lazy paragraph line. List markers do not always interrupt an open paragraph. The exact rules are in [block structure](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#paragraphs-and-interrupters).

## Import with the reference engine

The reference engine also imports Markdown directly, outside the 0.2 specification. Use `gfm` for ordinary Markdown:

```sh
node dist/cli.js import --from gfm page.md
```

`--from gfm` converts tables, task lists, strikethrough, bare URLs and footnotes. `--from markdown` reads strict CommonMark and keeps a GFM table as escaped paragraph text. The 0.1 Markdown importer read GFM, so a 0.1 `migrate --from markdown` becomes `import --from gfm`. The library call is `importDocument(source, { from: 'gfm' })`; see [Markdown import is GFM import](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md#markdown-import-is-gfm-import).

A folder of Markdown files converts in one run:

```sh
node dist/cli.js import --from gfm --directory docs --output docs-carve
```

Each `.md` or `.markdown` file becomes a `.crv` file at the same path, other files are copied, and a local link to a converted file is rewritten to its `.crv` name. The output directory must not exist yet and must lie outside the source. `docs-carve/migration-report.json` lists each file with its diagnostics and the state of each local link, and names the files that need review: a lost construct or a link the run could not check.

## Convert through HTML

Render the Markdown with a trusted Markdown renderer, save the HTML, then run the reference engine:

```sh
node dist/cli.js import --from html page.html
```

Inspect the imported source and any loss diagnostics. HTML cannot preserve every original Markdown spelling. Run `fmt --check`, render the result, and compare the HTML that matters to your site. Raw HTML in Markdown needs particular review: Carve treats bare tags as text and permits explicit raw HTML only under the host policy. See [HTML import](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md) and [HTML rendering](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md).

## Shared importer targets

For Carve 0.2, HTML is the specified import hub. A Markdown or Djot converter may produce HTML first; `carve import` then maps that HTML into Carve source. Compare the imported tree and rendered HTML for loss. See [HTML import](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md). The direct 0.1 Markdown and Djot importer flags are not part of the 0.2 command contract.
