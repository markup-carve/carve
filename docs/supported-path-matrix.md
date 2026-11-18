# Supported CLI paths

The Carve 0.2 command line has one specified render target, HTML, and one specified import source, HTML. It also reads and writes versioned AST JSON and canonical Carve source through separate commands. The reference engine calls the program `carve2` on `next2`. See [commands](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#commands).

| Input | Command | Output |
| --- | --- | --- |
| Carve source | `carve2 render` | HTML |
| 2.0 AST JSON | `carve2 render --from-ast` | HTML |
| Carve source | `carve2 ast` | 2.0 tree JSON |
| Carve source | `carve2 fmt` | Canonical Carve source |
| 2.0 AST JSON | `carve2 fmt --from-ast` | Canonical Carve source, with reported losses |
| HTML | `carve2 import --from html` | Carve source, with reported losses |
| 1.x or draft AST JSON | `carve2 migrate-ast` | 2.0 tree or envelope JSON |

The 0.2 specification does not require Markdown, plain text, ANSI, BBCode, Djot, or PDF routes. The JavaScript reference engine may have extra import adapters; their behavior is outside the specified path inventory. A target or bridge owned by another application should report any fields it cannot carry. See [format conversion](./format-bridges.md), [tooling scope](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#scope), and [the upgrade guide](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md#command-line-and-missing-features).
