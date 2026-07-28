# Carve optional Tier-2 corpus

This directory contains **optional** `(input.crv, expected.html)` pairs for
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

The filenames are stable (`NN-slug.crv` / `NN-slug.html`) so runners can pair
them by basename after filtering through the manifest.
