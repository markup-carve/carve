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

Build from a released carve-wasm tag, not an arbitrary `main` commit.

## Provenance

This copy was built from carve-wasm **v0.1.1**, which pins carve-rs **0.1.4**
(`2e9c43f2`).

The bundle carries its own stamp: `version()` returns the carve-wasm version it
was built from, so the vendored engine can be identified at runtime without
reading this file. Check it against the newest carve-wasm release to see whether
this copy has fallen behind.
