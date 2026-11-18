# Coming from Markdown

Carve is a separate language. A Markdown file needs conversion and review before it becomes a `.crv` document. The 0.2 reference engine imports HTML; a Markdown pipeline can render Markdown to HTML and then use `carve2 import`. See the [HTML import contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md) and [Upgrading from 0.1](./upgrade-0-2) if the source is already Carve 0.1.

## Rewrite the visible syntax

| Markdown habit | Carve 0.2 source |
|---|---|
| `**strong**` | `*strong*` |
| `*emphasis*` | `/emphasis/` |
| `~~strike~~` | `{~strike~}` |
| `---` thematic break | `***` |
| GFM separator table | `|=` header cells |
| Tilde code fence | Backtick code fence |

A blank line before a new heading or quote avoids a lazy paragraph line. List markers do not always interrupt an open paragraph. The exact rules are in [block structure](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#paragraphs-and-interrupters).

## Convert through HTML

Render the Markdown with a trusted Markdown renderer, save the HTML, then run the reference engine:

```sh
node dist/cli2.js import --from html page.html
```

Inspect the imported source and any loss diagnostics. HTML cannot preserve every original Markdown spelling. Run `fmt --check`, render the result, and compare the HTML that matters to your site. Raw HTML in Markdown needs particular review: Carve treats bare tags as text and permits explicit raw HTML only under the host policy. See [HTML import](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md) and [HTML rendering](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md).

## Shared importer targets

For Carve 0.2, HTML is the specified import hub. A Markdown or Djot converter may produce HTML first; `carve2 import` then maps that HTML into Carve source. Compare the imported tree and rendered HTML for loss. See [HTML import](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md). The direct 0.1 Markdown and Djot importer flags are not part of the 0.2 command contract.
