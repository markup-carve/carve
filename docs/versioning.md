---
description: How Carve 0.2 is developed, frozen and released.
---

# Versioning

Carve 0.2 is developed on the `main` branch. The [0.2 status](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md) identifies the current freeze candidate and the extension work that remains provisional. These pages describe that candidate, not a published 0.2 release.

## Language, tree, and extension versions

The language version and AST version are separate. A 0.2 document's tree uses `astVersion: "2.0"`. A major AST change may rename or remove fields; a minor 2.x AST change has only the limited additions allowed by the [AST version rules](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#root-envelope-and-versions). Qualified extensions declare exact versions independently. A reader refuses an unknown required extension or unsupported required version. It preserves an unknown optional extension and uses its core fallback. See [extension matching](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#registration-and-matching).

## Upgrade a document or integration

The [0.1 to 0.2 upgrade guide](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md) separates source changes, JavaScript API and HTML changes, command changes, and AST migration. The JavaScript reference engine provides an `upgrade` command for 0.1 source. `migrate-ast` converts older tree JSON. Neither is a version-string replacement; review diagnostics and rendered output after conversion.

A Carve source can declare a target version for linting under the [writer and lint contract](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#diagnostics-and-lint). The `carve-version-unsupported` rule reports a declaration the implementation cannot honor. Keep your engine and spec revision pinned while 0.2 is in development.
