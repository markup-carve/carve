# carve-wasm (vendored)

Browser WASM build of the reference Rust parser
([carve-rs](https://github.com/markup-carve/carve-rs)), wrapped by
[carve-wasm](https://github.com/markup-carve/carve-wasm).

The Playground page imports this vendored copy directly to offer a Rust engine
that runs fully client-side, alongside the JavaScript engine.

Do not edit by hand. To refresh after carve-rs / carve-wasm change, run:

```bash
npm run sync-carve-wasm
```

That rebuilds `../carve-wasm` with `wasm-pack` and copies its `pkg/` output here.

It builds the rendering profile plus the writer:
`--no-default-features --features other-renderers`. The Playground calls two
exports, `toHtmlWithOptions` to render and `toCarveWithOptions` for Format, so
the AST, import, report and patch surfaces are dropped. `other-renderers` is
the only carve-wasm feature that gates the writer; it also brings `toMarkdown`,
`toPlainText` and `toAnsi`. The feature list lives in
`scripts/sync-carve-wasm.mjs`.

Sizes on carve-wasm v0.1.9, gzip of `carve_wasm_bg.wasm`:

| Build | gzip |
|---|---|
| default features | 3.0 MB |
| `--no-default-features` (render only) | 0.89 MB |
| `--no-default-features --features other-renderers` (this copy) | 1.54 MB |

The writer itself is most of the step: a build exporting only
`toCarveWithOptions` measured 1.43 MB. The module loads only when a visitor
selects the Rust engine, so the JavaScript-only page does not pay for it.
A page that needs `parseJson`, an importer or a checked renderer has to add
that feature to the script.

Build from a released carve-wasm tag, not an arbitrary `main` commit. Point
`CARVE_WASM_DIR` at a checkout of that tag when it is not `../carve-wasm`.

The sync script passes `--remap-path-prefix` for `CARGO_HOME` and the
carve-wasm checkout, because a release build otherwise embeds the build
machine's own directory layout in its panic locations. Panic strings in this
copy therefore read `/cargo/git/checkouts/...`, which is a synthetic prefix and
not a path on anyone's disk. `tests/no-host-paths-in-tracked-files.test.mjs`
fails the suite if a rebuild reintroduces a real one.

## Provenance

This copy was built from carve-wasm **v0.1.9** (`f5a5bb2`), which pins the
published carve-rs crate **`carve-lang` 0.1.11**, with
`--no-default-features --features other-renderers`.

The bundle carries its own stamp: `version()` returns the carve-wasm version it
was built from, so the vendored engine can be identified at runtime without
reading this file. Check it against the newest carve-wasm release to see whether
this copy has fallen behind.
