# HTML import contract

This is an integration map for the normative [Carve 0.2 HTML importer](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md). Use the specification when exact element, attribute, whitespace, or diagnostic behavior matters. The 0.1 importer contract is not a substitute for it.

## Input and two outputs

`importDocument` takes HTML text and `from: "html"`. It returns a 2.0 document tree, canonical Carve source, and a diagnostics record. The tree is the semantic result. The source is what the canonical writer can spell; losses identify facts with no faithful Carve spelling. A roundtrip render may carry Carve facts that ordinary HTML cannot express, and the importer reads those carriers. See [scope and input](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#scope-and-input) and [carriers](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#carriers-and-the-two-documents).

## Conversion stages

The importer reads HTML structure, whitespace, block and inline elements, lists, tables, figures, links, images, attributes, footnotes, and raw content under separate rules. These sections give the precedence and the repairs for malformed or unsupported shapes:

- [Content and whitespace](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#how-content-is-read)
- [Blocks and lists](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#block-elements)
- [Tables and figures](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#tables)
- [Inline elements, links, and images](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#inline-elements)
- [Attributes and unsupported elements](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#attributes)
- [Footnotes and raw content](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#footnotes)

Do not infer the Carve source from the original HTML's textual spelling. The importer normalizes whitespace, repairs some structures, and then uses the writer. An unsupported element may contribute its children while losing its element identity. For machine migration, compare the returned tree and diagnostic codes, not HTML strings alone. See [normalization](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#normalization).

## Failure policy

`strictLosses` rejects a result with a non-allowed render loss. Invalid HTML input and an invalid produced tree have distinct CLI failure categories. `rawHtml` is false by default and changes which raw elements can be kept. See [import diagnostics](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#diagnostics), [the guarantee](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#the-guarantee), and [CLI exits](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#exit-codes).
