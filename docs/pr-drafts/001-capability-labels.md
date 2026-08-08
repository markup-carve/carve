# Draft PR: Add Implementation Capability Labels

## Summary

Add explicit capability labels for Carve implementations so "supports Carve"
does not imply AST exchange, source positions, formatting, optional extensions,
or multi-target rendering.

The minimum full-parser label becomes `core-html`: parse Tier-1 source and
match the core HTML corpus. Other capabilities are named independently.

## Problem

`docs/implementing-carve.md` currently defines the bar for "a Carve
implementation" as Tier-1 core corpus conformance, but the ecosystem also tracks
AST JSON, source positions, formatter round-trip, optional corpus support, and
non-HTML targets. Those are real capabilities, but bundling them under one
informal "compatible" status raises the apparent cost of writing a new engine.

The result is a messaging problem:

- a new engine can be fully useful for source-to-HTML before it has AST JSON;
- an editor grammar can be useful without being a renderer;
- a Pandoc bridge can be meaningful without being a parser;
- formatter and position support are higher bars than core rendering.

This PR separates those claims.

## Proposed Changes

### 1. Add capability labels to `docs/implementing-carve.md`

Add this section after "Conformance tiers":

```md
## Implementation capability labels

Use capability labels for implementation status. A project may support Carve at
different depths; do not imply AST exchange, source positions, formatting, or
multi-target rendering from core HTML conformance alone.

| Label | Meaning | Typical gate |
|---|---|---|
| `core-html` | Parses Tier-1 Carve source and renders byte-identical HTML for the core corpus. | `npm run compare:impls` / core corpus |
| `optional-html` | Supports one or more Tier-2 optional extensions with matching optional-corpus output. | `tests/corpus-optional` for the claimed extensions |
| `ast-json` | Emits and ingests the canonical Carve AST shape. | `npm run ast:check` |
| `positions` | Emits conforming `pos` spans, with only declared waivers. | `tests/ast-positions.test.mjs` and `tests/ast-spans.test.mjs` |
| `formatter` | Writes canonical Carve source and preserves parse/fmt round-trip. | `tests/corpus-fmt-roundtrip.test.mjs` |
| `multi-target` | Renders at least one non-HTML presentation target such as Markdown, plain text, or ANSI. | target-specific corpus or optional-corpus checks |
| `safe-mode` | Implements the required URL, raw HTML, and attribute hardening for untrusted input. | security corpus cases |
| `syntax-tooling` | Provides highlighting, structural editing, diagnostics, or language-server support without claiming parser conformance. | tool-specific tests |
```

Then replace:

```md
A partial tool (highlighting-only, an editor grammar, a one-way converter) is
still welcome in the ecosystem - it is listed on the [Ecosystem](./ecosystem)
page with an honest status tag rather than claimed as a full implementation.
```

with:

```md
A partial tool (highlighting-only, an editor grammar, a one-way converter) is
still welcome in the ecosystem. It should use a capability label such as
`syntax-tooling`, `ast-json`, or `multi-target` instead of claiming
`core-html`.
```

### 2. Add a labels column to `docs/ecosystem.md`

Change the parser table from:

```md
| Project | Language | Status |
|---|---|---|
| [carve-js](https://github.com/markup-carve/carve-js) | TypeScript | Reference implementation. Tier-1 corpus passing. |
```

to:

```md
| Project | Language | Status | Capability labels |
|---|---|---|---|
| [carve-js](https://github.com/markup-carve/carve-js) | TypeScript | Reference implementation. Tier-1 corpus passing. | `core-html`, `optional-html`, `ast-json`, `positions`, `formatter`, `multi-target`, `safe-mode` |
```

Suggested parser rows:

```md
| [carve-js](https://github.com/markup-carve/carve-js) | TypeScript | Reference implementation. Tier-1 corpus passing. | `core-html`, `optional-html`, `ast-json`, `positions`, `formatter`, `multi-target`, `safe-mode` |
| [carve-rs](https://github.com/markup-carve/carve-rs) | Rust | Parser + HTML renderer with a `carve` CLI. Tier-1 corpus passing. | `core-html`, `ast-json`, `positions`, `formatter`, `multi-target`, `safe-mode` |
| [carve-php](https://github.com/markup-carve/carve-php) | PHP | Forked from djot-php; Carve syntax implemented, corpus passing. Powers the PHP sandbox and wp-carve. | `core-html`, `ast-json`, `positions`, `formatter`, `multi-target`, `safe-mode` |
| [carve-wasm](https://github.com/markup-carve/carve-wasm) | WASM | Browser/Node bindings for carve-rs. Early. | inherits carve-rs labels |
```

Suggested editor-support rows:

```md
| [tree-sitter-carve](https://github.com/markup-carve/tree-sitter-carve) | Tree-sitter | Grammar for highlighting and structural editing. | `syntax-tooling` |
| [carve-lsp](https://github.com/markup-carve/carve-lsp) | LSP | Language server - syntax diagnostics, Djot/Markdown collision hints. Early. | `syntax-tooling` |
```

Do not force every ecosystem table to carry labels in this PR. Start with
parsers and editor support; expand later where it helps.

### 3. Mention labels in `docs/implementation-comparison.md`

Add a short note near the top:

```md
The comparison runner measures `core-html` by default and reports optional
extension coverage separately. AST JSON, position, formatter, and non-HTML
target claims are tracked by separate gates; see Implementation Capability
Labels in Build Your Own Implementation.
```

## Non-Goals

- This PR does not change the normative conformance corpus.
- This PR does not weaken Tier-1 core.
- This PR does not require all ecosystem entries to be relabeled immediately.
- This PR does not define public badge artwork or shields.

## Open Questions

- Should `safe-mode` be a separate label if security hardening is mandatory for
  `core-html`, or is it useful because hosts expose safe/unsafe render modes
  differently?
- Should `multi-target` require two targets total, or one non-HTML target in
  addition to HTML?
- Should bindings inherit labels from their engine by default, or declare only
  what the binding exposes?

## Why This Helps

This keeps the entry bar honest. A new implementation can aim for `core-html`
first, then add `ast-json`, `positions`, `formatter`, and `multi-target` without
the ecosystem treating the early version as fake or incomplete.

