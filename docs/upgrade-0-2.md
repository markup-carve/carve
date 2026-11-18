# Upgrading from 0.1

Carve 0.2 is a development version. Start with a copy of each 0.1 `.crv` file. The [0.2 upgrade guide](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md) and its [upgrade map](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/upgrade-map.json) list the source and output changes. Some old source remains valid while its HTML changes, so a clean parse is not enough.

## Run the reference rewrite tool

Build `carve-js` on `next2` with `npm ci` and `npm run build`. Its 0.2 CLI is `node dist/cli2.js`. In a working copy of a 0.1 document:

```sh
node dist/cli2.js upgrade --check page.crv
node dist/cli2.js upgrade --json page.crv
node dist/cli2.js upgrade --write page.crv
```

`--check` writes nothing and exits 1 when a change or human review is needed. `--json` writes a structured report. Without `--write`, upgraded source goes to standard output and the report to standard error. `--write` replaces the input after checking the old and proposed HTML. A usage error exits 2. `--force` does not bypass an HTML mismatch. Run the tool **once per 0.1 file**: it is not idempotent on already upgraded source. This `upgrade` command is specific to the JavaScript reference engine; the shared [0.2 tooling contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#scope) does not require it.

Read `rewrite`, `escape`, `report`, `upgrade-conflict`, and `upgrade-mismatch` records. A mismatch prevents writing. Even a passing rewrite needs review: the tool's HTML comparison normalizes attribute order, whitespace between tags, and a leading line feed in list item text. Its `U-079` report asks you to review host render options.

## Common source rewrites

These pairs are outputs measured with `carve2 upgrade` on 0.1 input. The left fences show old source, not 0.2 examples.

A heading after a paragraph needs a blank line (`U-001`):

```text
A paragraph.
# Heading
```

```crv
A paragraph.

= Heading
```

A hyphen thematic break becomes a star break (`U-044`):

```text
Before

---

After
```

```crv
Before

***

After
```

A GFM separator row becomes native header marks (`U-055`):

```text
| a | b |
|---|---|
| 1 | 2 |
```

```crv
|= a |= b |
| 1 | 2 |
```

Other common edits include changing bare `_`, `~`, and `=` inline formatting to braced forms, removing `+` continuation lines and indenting the following block within its owner, and replacing tilde fences with backticks. See the [source change index](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md#source-change-index) for cases the tool only reports.

## Review changed output

Compare representative pages rendered by both engines. Check headings and generated ids, list tightness and task items, table headers, footnotes, links, captions, and raw HTML. The 0.2 output contract is [HTML](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md). Markdown, plain text, and ANSI writers from 0.1 have no 0.2 counterpart. A Markdown source first goes through an HTML renderer and the [HTML import](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md) path.

## Update the host

The current package root of `carve-js` still exports 0.1. The 0.2 entry point is `v2/src/index.ts`; move `carveToHtml` callers to `render`, and consumers of old report objects to `renderWithDiagnostics`. Stored trees need the 2.0 schema and `migrateTree` or `migrate-ast` before a strict 2.0 decoder reads them. Source layout is a sidecar. See the [integrator migration table](https://github.com/markup-carve/carve/blob/next2/spec/0.2/UPGRADING.md#part-2-integrators-your-code-and-your-pages), [AST](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md), and [source layout](https://github.com/markup-carve/carve/blob/next2/spec/0.2/source-layout.md).

Review options instead of reusing a 0.1 options object. The 0.2 host must choose its URL policy, raw HTML behavior, include resolver and root, extension registrations, and strict loss handling. Compare site CSS and scripts against the 0.2 section, list, and table HTML. Keep the JSON upgrade report with the source change for review.
