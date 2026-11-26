---
description: Why Carve 0.2 specifies no source-patch API, and what to use instead.
---

# Source-preserving patches

Carve 0.2 does not specify the 0.1 source-patch or editor API. The reference 0.2 tooling contract offers parsing, source layout, formatting, writing, diagnostics, and AST migration, but no `createSourcePatch`, `applySourcePatch`, or `toCarvePatch`. See [tooling calls](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#library) and [the upgrade guide](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md#javascript-api).

For an editor integration, keep the original source, request `parseWithLayout`, and use its byte ranges only with the tree and source from that parse. After an edit, parse again and rebind sidecar paths. `fmt` writes canonical source and may change spelling outside a small edit; it is a document formatter, not a patch protocol. See [source layout](./ast-source-layout.md) and [`carve fmt`](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#carve-fmt).

A host that requires minimal patches can maintain its own patch format and conflict checks. It should not present that format as a 0.2 Carve interoperability contract.
