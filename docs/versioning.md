---
description: How Carve 0.2 is versioned and frozen, how a document declares its version, and how to upgrade documents and trees.
---

# Versioning

This page explains which version numbers Carve uses, what each one covers, and how to tell whether a change affects your documents or your integration.

## Status of 0.2

Carve 0.2 is developed on the `main` branch. It is a freeze candidate, not a published release: the 0.2 status file in the specification records each candidate and the rulings that produced it. Once a text is frozen, it changes only by a ruling recorded with its reason, and a ruling on a frozen clause makes a new revision of the candidate. The extension mechanism is still labeled provisional; the other parts of the specification are frozen subject to such rulings.

These pages describe that candidate. Until 0.2.0 is tagged, keep your engine and the specification revision you test against pinned together.

Carve is pre-1.0, so a minor version (0.1 to 0.2) can change what existing documents render to. 0.2 is such a change; the [upgrade guide](./upgrade-0-2) lists every difference.

## Three separate versions

Carve versions three things independently:

| Version | What it covers | Where it appears |
|---|---|---|
| Language version | The Carve syntax and rendering rules, such as `0.2` | The engine's `SPEC_VERSION`; a document's `carve` frontmatter key |
| AST version | The JSON tree contract, such as `2.0` | `astVersion` on the tree root and envelope |
| Extension version | One qualified extension, such as `carve.tabs` version `1` | The extension declaration on the root and on each extension node |

### AST versions

A 0.2 tree carries `astVersion: "2.0"`. The AST version has the form `major.minor` and versions the tree contract, not the language:

- A **major** version may remove, rename or reinterpret a field or a node type. Each major version ships a migration function from the previous one.
- A **minor** version within 2.x adds only optional declared extensions, extension nodes with a fallback, and namespaced `data`. It adds no core field and no core node type, so a new construct first arrives as an extension node with a fallback and becomes a core node at the next major version.
- A reader refuses a higher major version, an unknown core field or node type, an unknown required extension and an extension node without a valid fallback. It accepts every 2.x minor version it can read under those rules.

Until the 0.2.0 release, contract 2.0 itself may still change; these stability rules apply from that release on. See [AST JSON](./ast-json).

### Extension versions

Each qualified extension declares its own version, independently of the language and AST versions. A reader refuses a required extension whose name or version it does not implement. It keeps an unknown optional extension and uses that node's core fallback. A host registers a renderer by extension name and version, so a renderer for one version does not silently render another. See [Extensions](./extensions).

## Declaring a target version

An author can state which Carve version a document targets with the `carve` key (or the 0.1 spelling `carve-version`) in the frontmatter block on line 1:

::: compare
```crv
---
carve: 0.2
---

Text.
```
```html
<p>Text.</p>
```
:::

The key is optional, and frontmatter renders nothing. Only the line-1 block counts; a later metadata block cannot set or override the version.

`carve lint` reads the key and reports `carve-version-unsupported` when the document targets a version the engine does not implement, or a value it does not recognize. Without that warning the failure would be silent: constructs the author relied on parse as something else and nothing says so.

::: compare
<!-- carve-sample {"lint":"the declared version is newer than the engine"} -->
```crv
---
carve-version: 9.9
---

Text.
```
```html
<p>Text.</p>
```
:::

The key also controls migration notices. Some lint rules report text that is valid 0.2 only because 0.1 read the same text differently, or a spelling 0.2 removed. These rules are off by default, so a 0.2 document lints clean of them. They turn on when the document declares a version below 0.2 (such as `carve: 0.1` or `carve-version: 0.1.13`) or under `carve lint --upgrade`. See [Validation](./validation).

## Upgrading a document or integration

The [upgrade guide](./upgrade-0-2) separates source changes, JavaScript API and HTML changes, command changes and tree migration. Two tools do the mechanical part:

- **`carve upgrade`** (JavaScript engine only, outside the specification) reads 0.1 source, renders it with the pinned 0.1 engine, proposes 0.2 source and checks that the 0.2 rendering matches. `--check` writes nothing and exits 1 when a change or a human review is needed, which makes it usable as a CI gate over a directory of 0.1 documents. `--json` prints the report, and `--write` rewrites the file. Run it once on 0.1 files only: it always reads its input as 0.1, so feeding it upgraded 0.2 source proposes wrong edits.
- **`carve migrate-ast`** converts a 1.x or draft tree in JSON to a 2.0 tree.

Neither is a version-string replacement. Review every report entry and the rendered output after conversion, and check host render options as well: raw HTML is off by default in 0.2 (see [Security](./security)).

### The 0.1 provenance stamp

In 0.1, `carve fmt --stamp` wrote a trailing comment such as `%% carve-version: 0.1; generated-by: carve-js 0.1.0`, and `--stamp-info`, `--stamp-check` and the `readStamp` / `needsReview` calls read it back. 0.2 has no counterpart. An existing stamp is now an ordinary comment that renders nothing. Use the frontmatter key above to declare a version, `carve-version-unsupported` to check it, and `carve upgrade --check` to find 0.1 documents that still need work.

The 0.1 section "Behavior changes inside 0.1.x" described output changes between 0.1 patch releases. That history belongs to the 0.1 line and is in `CHANGELOG-0.1.md` and the 0.1 changelog entries; the per-implementation stamp table went with the stamp.

## Changelog

Released changes live in [CHANGELOG.md](https://github.com/markup-carve/carve/blob/main/CHANGELOG.md), which is written per merge and cut into sections at each tag; releases before 0.1.6 are archived in [CHANGELOG-0.1.md](https://github.com/markup-carve/carve/blob/main/CHANGELOG-0.1.md). There is one changelog file, and this page points to it rather than keeping a second copy that could drift.

For decisions behind the 0.2 rules and retired 0.1 readings, see [Specification decision history](./spec-history).

**Specification (external):** [Status](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md); [AST](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#root-envelope-and-versions), clauses C2-A-008 and C2-A-012 to C2-A-019, C2-A-176; [Extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#registration-and-matching), clauses C2-X-001 to C2-X-003 and C2-X-033; [Writer and lint](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#diagnostics-and-lint), clause C2-W-156 and the `carve-version-unsupported` row; [Syntax blocks](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md), clause C2-B-231; [Tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md), clause C2-T-003 and `carve migrate-ast`; [Upgrading](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md), "Running the rewrite tool".
