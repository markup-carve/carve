---
description: Diagnostic codes, severities, channels and ranges in Carve 0.2.
---

# Validation

Carve 0.2 reports diagnostics in one record beside the tree. Each entry has a code, severity, channel, message, and optional byte range or JSON Pointer. The channels are `parse`, `lint`, and `render-loss`. See [diagnostics](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#diagnostics) and [writer and lint](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#diagnostics-and-lint).

## Command line

`carve lint FILE` prints parse and lint findings. `--json` writes the diagnostics report. `--rules '{"rule-id":"off"}'` changes a rule; `--platforms '["github"]'` enables platform checks. `--upgrade` turns on the migration notices, which report valid 0.2 text that 0.1 or Djot read differently and the spellings 0.2 removed (the `deprecated-` rules and most `djot-` rules among them); they are also on for a document whose line-1 frontmatter declares `carve: 0.1`. See [migration notices](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#diagnostics-and-lint). `carve diagnostics FILE` reports the parse channel. A lint run exits 1 for a warning or error, but 0 for hints alone. See [CLI lint](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#carve-lint) and [diagnostics command](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#carve-diagnostics).

`carve fmt --check FILE` checks canonical source without writing it. Use `carve fmt -w FILE` to write it and `--normalize` to discard measured spelling. Formatting is not automatic repair of a semantic error. See [formatter](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#carve-fmt).

## Programmatic checks

The JavaScript API offers `lint`, `parseWithDiagnostics`, `renderWithDiagnostics`, `formatWithDiagnostics`, and `writeWithDiagnostics`. Rendering and writing can report losses that lint alone does not expose. Check the record before accepting a conversion. See [tooling calls](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#library) and [diagnostic rules](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#diagnostics-and-lint).

`allowLosses` lists render-loss codes a host accepts: they leave the record and never fail `strictLosses`. `maxLosses` (default 100) caps the losses the record keeps and counts the rest in `suppressedDiagnostics`. The command line sets them with `--allow-loss` and `--max-render-losses`. `positionOf(source, offset)` turns a byte offset of an entry into the line and column the command line prints. See [render options](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options) and [diagnostics and reports](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#diagnostics-and-reports).

## Lint rule catalog

The following 120 lint-channel rows, every row except the two with status `void`, come from [`spec/0.2/data/lint-rules.json`](https://github.com/markup-carve/carve/blob/next2/spec/0.2/data/lint-rules.json). That file also defines parse and render-loss codes, exact messages, conditions, and clause references. `on` and `off` are the default settings; `upgrade` marks a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given; `platforms` marks a platform rule, off unless the option `platforms` selects its platform (C2-W-109). The data file is authoritative if a row changes.

| Rule id | Severity | Default |
| --- | --- | --- |
| `a11y/image-alt` | warning | on |
| `bare-html-tag` | warning | on |
| `bidi-control-in-source` | warning | on |
| `blank-reference-label` | warning | upgrade |
| `block-marker-as-text` | warning | on |
| `block-opener-overindented` | warning | on |
| `block-opener-without-blank-line` | warning | on |
| `blockquote-marker-without-space` | warning | on |
| `braced-comment-in-a-template-source` | warning | on |
| `braced-span-opener-as-text` | warning | on |
| `broken-crossref` | warning | on |
| `broken-fragment-link` | warning | on |
| `caption-looking-paragraph` | warning | on |
| `carve-version-unsupported` | warning | on |
| `colon-fence-length-mismatch` | warning | on |
| `comment-fence-closer-with-text` | warning | upgrade |
| `comment-in-reference-label` | warning | on |
| `comment-line-in-line-block` | hint | on |
| `comment-shaped-emphasis` | hint | on |
| `comment-splits-table-row` | hint | on |
| `consumed-key-near-miss` | warning | on |
| `continuation-reading-changed` | warning | upgrade |
| `definition-in-container` | warning | on |
| `definition-term-block-folded` | warning | on |
| `delimited-table-wide-row` | warning | on |
| `deprecated-bare-highlight` | warning | upgrade |
| `deprecated-bare-strike` | warning | upgrade |
| `deprecated-bare-underline` | warning | upgrade |
| `deprecated-cell-alignment` | warning | upgrade |
| `deprecated-continuation-marker` | warning | upgrade |
| `deprecated-indented-line-under-heading` | warning | upgrade |
| `deprecated-loose-attribute` | warning | upgrade |
| `deprecated-separator-row` | warning | upgrade |
| `deprecated-spaced-thematic-break` | warning | upgrade |
| `deprecated-substitution-arrow` | warning | upgrade |
| `deprecated-table-attribute` | warning | upgrade |
| `description-separator-below-content-column` | warning | on |
| `description-term-multi-line` | hint | on |
| `djot-definition-list` | hint | upgrade |
| `djot-emphasis-underscore` | warning | upgrade |
| `djot-emphasis-underscore-braced` | hint | upgrade |
| `djot-heading-continuation` | warning | upgrade |
| `djot-highlight-braces` | warning | off |
| `djot-intraword-underscore` | warning | upgrade |
| `djot-ordered-marker` | hint | upgrade |
| `djot-plus-bullet` | warning | upgrade |
| `djot-subscript-tilde` | warning | upgrade |
| `djot-subscript-tilde-braced` | warning | upgrade |
| `djot-superscript-caret` | warning | upgrade |
| `djot-tag-mention` | hint | upgrade |
| `djot-typography-sign` | hint | upgrade |
| `duplicate-reference-url` | warning | off |
| `emphasis-as-heading` | warning | off |
| `emphasis-marker-before-attributes` | warning | on |
| `empty-include-path` | warning | on |
| `empty-link-destination` | warning | on |
| `empty-reference-definition` | warning | on |
| `fence-closer-indented` | hint | on |
| `figure-group-empty` | warning | on |
| `figure-group-nested` | warning | on |
| `figure-group-opener-metadata` | warning | on |
| `figure-group-panel-number` | warning | on |
| `figure-group-single-panel` | warning | on |
| `footnote-labels-differ-only-in-whitespace` | warning | on |
| `footnotes-placement-in-container` | warning | on |
| `frontmatter-crossref` | error | on |
| `frontmatter-shaped-thematic-break` | warning | on |
| `github-alert-marker` | warning | on |
| `glob-shaped-strong` | hint | on |
| `heading-closing-hashes` | warning | on |
| `heading-level-skip` | warning | on |
| `heading-marker-mixed` | hint | on |
| `heading-trailing-attribute` | warning | on |
| `html-comment-renders-as-text` | warning | on |
| `include-attributes-unused` | warning | on |
| `include-lines-table-rows-hint` | hint | on |
| `indented-code-block` | warning | on |
| `link-definition-indented-line` | hint | on |
| `link-gap-before-destination` | warning | on |
| `list-item-block-overindented` | warning | on |
| `list-item-body-below-content-column` | hint | on |
| `list-marker-below-content-column` | warning | on |
| `list-marker-without-blank-line` | warning | on |
| `markdown-definition-paragraph` | warning | on |
| `markdown-strikethrough-double-tilde` | warning | on |
| `markdown-strong-double-star` | warning | on |
| `non-descriptive-link-text` | warning | off |
| `ordered-list-kind-split` | warning | on |
| `ordered-marker-right-aligned` | warning | on |
| `platform-issue-reference` | warning | platforms |
| `platform-mention-token` | warning | platforms |
| `quote-fence-ends-the-quote-above` | warning | on |
| `region-marker-renders-as-text` | warning | on |
| `semantic-attribute-outside-span` | warning | on |
| `semantic-attribute-value-ignored` | warning | on |
| `setext-heading-underline` | warning | on |
| `sigil-after-letter` | hint | upgrade |
| `table-attribute-invalid` | warning | on |
| `table-column-arity` | warning | on |
| `table-column-overlap` | warning | on |
| `table-marker-run-padding` | warning | on |
| `table-row-attribute-as-cell` | warning | on |
| `table-row-cell-count` | warning | on |
| `table-row-count-clamped` | hint | on |
| `table-shaped-paragraph` | warning | on |
| `table-span-marker-attribute` | warning | on |
| `table-span-marker-blocked` | warning | on |
| `table-width-total` | warning | on |
| `thematic-break-spelling` | hint | upgrade |
| `tight-list-item-with-blank-line` | hint | upgrade |
| `unattached-block-attribute` | warning | on |
| `unattached-caption` | warning | on |
| `unattached-inline-attribute` | hint | on |
| `unclosed-braced-comment` | warning | on |
| `unclosed-inline-emphasis` | warning | on |
| `uneven-list-indent` | warning | on |
| `unresolved-footnote` | warning | on |
| `unresolved-reference-link` | warning | on |
| `unused-footnote-definition` | warning | on |
| `unused-link-reference-definition` | warning | on |
