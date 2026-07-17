# Carve corpus — djot-style mirror

These `.test` files are the **same corpus** as [`../corpus/`](../corpus/), re-emitted in the fenced-example format that [`jgm/djot.js`](https://github.com/jgm/djot.js) popularised. They exist so implementations whose runners already speak that format (notably [`markup-carve/carve-php`](https://github.com/markup-carve/carve-php)'s `OfficialTestSuiteTest`) can consume the Carve spec without writing a new file-pair reader.

This is a **derived directory** — do not edit the files here. Edits to the source pages under `docs/examples/` (`core.md`, `extensions.md`, `edge-cases.md`) regenerate both `../corpus/*.{crv,html}` and `*.test` on the next `npm run corpus:build`. Edits made directly to `.test` files will be overwritten.

## Format

Each `.test` file contains one or more fenced examples. The fence is triple-backtick by default; the generator widens it (4+ backticks) when the example body itself contains backtick runs (e.g. fenced code blocks inside the input or expected HTML).

Inside each fence, the input and expected output are separated by a line containing only a single `.`:

````
input goes here
.
expected HTML goes here
````

Prose lines (outside fences) are ignored by parsers and serve as human-readable context.

## Consuming the corpus

Pull this repo as a git submodule, then iterate:

```sh
git submodule add https://github.com/markup-carve/carve.git spec
# parsers can now read spec/tests/spec/*.test
```

For a reference runner that walks fenced examples, see [`markup-carve/carve-php`](https://github.com/markup-carve/carve-php)'s `tests/OfficialTestSuiteTest.php` — it is the most direct example of consuming this format.

## Canonical format

For implementations starting fresh, the paired-file format at [`../corpus/`](../corpus/) is simpler to consume (one input file, one expected file, both named by basename). Either format is fine — pick whichever fits your test runner.

Tier-2 optional coverage lives separately at [`../corpus-optional/`](../corpus-optional/).
Those fixtures are feature-tagged via `manifest.json` and are consumed only by
implementations that explicitly enable the corresponding feature.
