---
description: Turn HTML into a Carve tree, Carve source and diagnostics.
---

# Import HTML

Carve 0.2 uses HTML as its specified import hub. The importer returns a 2.0 tree, Carve source, and diagnostics. The normative behavior is in [importing HTML](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md); the command and library entry points are in [tooling](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#carve-import).

## Basic workflow

```sh
carve import --from html page.html > page.crv
carve lint page.crv
carve render page.crv > page-output.html
```

For a JavaScript integration, call `importDocument(html, { from: "html" })` and inspect its `document`, `source`, and diagnostics record. The source is a canonical spelling of the imported tree when the writer can express it. See [the two results](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#carriers-and-the-two-documents).

## What the importer reads

Importing `<p>Hello <strong>world</strong>.</p>` produces this Carve source in the reference engine:

```carve
Hello *world*.
```

The importer maps supported HTML elements to Carve structures, preserves the order of content, and reports normalization or loss. It reads roundtrip carriers emitted by a 0.2 render, but an arbitrary HTML page need not carry them. The [semantic mapping](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#how-content-is-read), [whitespace rules](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#whitespace), and [normalization rules](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#normalization) define the result.

Use `--report-losses FILE` to save diagnostics and `--strict-losses` when a lossy import must fail. `--allow-loss CODE` exempts a specific render-loss code. The importer and writer both contribute to that report. See [diagnostics](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#diagnostics) and [the guarantee](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#the-guarantee).

## Raw content and trust

Raw HTML is off by default. `--raw-html` lets the importer retain raw content under the [raw-content rules](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#raw-content). Use it only when the source and eventual render target are trusted. URL policy still applies to URL sinks. See [security](./security.md).

## Changed in 0.2

The specified CLI imports `--from html`. The reference JavaScript engine may offer Markdown, GFM, and Djot adapters, but they are outside the 0.2 import contract. To move one of those inputs through the specified path, convert it to HTML first and import that HTML. The 0.1 `migrate --from html` path becomes `import --from html`. See [the upgrade guide](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md#command-line-and-missing-features).
