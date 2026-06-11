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
