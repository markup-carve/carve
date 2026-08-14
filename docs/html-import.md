---
description: The contract for converting HTML into Carve - a migration boundary, deliberately not a general HTML serializer.
---

# HTML import contract

HTML import is a migration boundary, not an HTML serializer. Implementations
parse HTML with an HTML5 parser, map supported semantics to the Carve AST, and
use the normal Carve writer for source output.

## Pipeline

```
HTML bytes -> HTML5 DOM -> import policy -> Carve AST -> canonical writer
```

Imported nodes do not carry Carve source positions. An implementation may
report HTML locations separately, but must not put HTML offsets in `pos`.

## Modes

- `safe` is the default for arbitrary input. It removes active content and
  event handlers and does not preserve raw HTML or source-provenance metadata.
  Harmless attributes with a Carve representation remain structured.
- `semantic` is for trusted CMS/editor input. It additionally applies the
  explicit CSS mappings and editor adapter metadata defined by the importer.
- `roundtrip` is only for HTML emitted by a Carve implementation. It may honor
  Carve provenance metadata and preserve otherwise unsupported markup as raw
  HTML. It is not safe for untrusted input.

All modes remove `script`, `style`, `template`, `noscript`, and event-handler
attributes. `roundtrip` may recover source embedded by a Carve renderer, but
must never execute it.

## Result and diagnostics

Import APIs return both the document and an ordered diagnostic list. Every
lossy decision should be observable. The common diagnostic codes are:

- `element-dropped`: an element and its contents were removed.
- `element-unwrapped`: an unsupported element was replaced by its children.
- `attribute-dropped`: an attribute was not represented.
- `style-unmapped`: CSS had no explicit semantic mapping.
- `table-degraded`: a table could not be represented structurally.
- `raw-preserved`: unsupported trusted markup was retained as raw HTML.
- `diagnostics-truncated`: the diagnostic cap was reached.

Diagnostics have `code`, `message`, `severity` (`info`, `warning`, or `error`),
and optional `path`, `line`, and `column`. Their order follows document order.

## Required API surface

JavaScript exposes `htmlToAst(html, options)` and `htmlToCarve(html, options)`.
Rust exposes `html_to_ast` and `html_to_carve`. PHP exposes
`convertWithReport`; its existing `convert` method remains a source-only
convenience API. CLIs expose `carve migrate --from html`, with `--mode`,
`--report`, and `--check-loss`.

Adapters may normalize editor-specific markup before the core policy. The
portable adapter names are `generic`, `tiptap`, `prosemirror`, `ckeditor`,
`tinymce`, `word`, and `google-docs`. Unknown adapters must be rejected.

## Conformance fixtures

Each directory under `tests/html-import` contains `input.html`,
`expected.crv`, `expected.ast.json`, and `expected.report.json`. Implementations
may add platform-specific fixtures, but shared fixtures define the portable
minimum. AST comparison ignores object-key order and absent optional fields;
source comparison uses the canonical writer byte-for-byte. Diagnostic fixture
objects are minimum matches: implementations may add optional location fields.

## CSS policy

CSS is not parsed generally. Implementations may map only explicit declarations
with stable Carve semantics, initially `text-align`, `font-weight`,
`font-style`, and `text-decoration`. All other declarations produce
`style-unmapped` in `semantic` and `roundtrip` modes.

## Resource limits

Importers must bound DOM depth, AST depth, node count, and diagnostic count.
On a structural limit, return or throw a typed error rather than emitting a
partial document. A diagnostic cap may instead replace its last entry with the
`diagnostics-truncated` error diagnostic.
