# Carve optional Tier-2 corpus

This directory contains **optional** `(input.crv, expected output)` pairs for
Tier-2 features from the Carve extensions contract.

Unlike the mandatory Tier-1 corpus in [`../corpus/`](../corpus/), these cases
require a feature to be explicitly enabled or configured by the implementation.
The canonical feature ids live in [`manifest.json`](./manifest.json).

## Feature-tagged consumption

An implementation should:

```sh
git submodule add https://github.com/markup-carve/carve.git spec
# then read spec/tests/corpus-optional/manifest.json
# and run only the cases whose feature ids it supports
```

The spec does **not** prescribe how a runner maps a feature id to local setup.
Examples:

- `social-link-templates` → mention/tag URL template config
- `symbol-map` → `:name:` symbol map (e.g. shortcode-to-glyph for emoji)
- `smart-quotes-locale-de` → locale-aware quote extension/config
- `bare-url-autolink` → bare-URL autolink extension/config
- `smart-typography-off` → the optional document-global `smartTypography: false`
  switch (PART 9 §8); implementations that do not offer the switch skip the case
- `markdown-typography-source` → the optional Markdown-renderer setting that
  emits a smart-punctuation node's source run instead of its glyph (PART 9 §8)

The filenames are stable (`NN-slug.crv` / `NN-slug.<ext>`) so runners can pair
them by basename after filtering through the manifest.

## Targets

A case may name a `target` in its manifest entry. It defaults to `html`, which
is what every case pinned before [carve#360](https://github.com/markup-carve/carve/issues/360),
so an entry without one keeps its `NN-slug.html` pair and needs no runner
change. The expected file's extension follows the target:

| `target` | expected file | rendered with |
|---|---|---|
| `html` (default) | `NN-slug.html` | the HTML target |
| `markdown` | `NN-slug.md` | the Markdown target |
| `plain` | `NN-slug.txt` | the plain-text target |
| `ansi` | `NN-slug.ansi` | the ANSI target |

There is deliberately no `carve` target here: Carve-source expectations live in
[`../corpus-roundtrip/`](../corpus-roundtrip/), and a second home would put two
files named `NN-slug.crv` in this directory, one of them the input.

Why this exists: until #360 **no corpus pinned any target but HTML**, so two
engines could render the same document to different Markdown and nothing
failed. That is not hypothetical - it is how carve-php and carve-js came to
disagree about escaping intraword underscores.

A runner that predates targets is unaffected. It reads a feature id it does not
recognize and skips the case, which is the same thing it already does for any
feature it has not implemented.
