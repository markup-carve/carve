# Writer escaping strategy

The 0.2 canonical writer chooses escapes by parsing a candidate spelling in its actual context. It starts with bare text, finds the leftmost construct that the intended tree does not contain, escapes that opener, and parses again. It also handles the small set of cases where a bare character prevents an intended node from forming. The procedure defines the canonical bytes; a fixed list of punctuation characters does not. See [writer escaping](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#escaping).

A canonical pipe table uses header cell marks rather than a separator row:

```carve
|= Name |= Qty |
| Apple | 2 |
```

The writer checks two gates: its output parses back to an equal semantic tree when the source shape is spellable, and formatting that output again is stable. A supplied interchange tree may contain shapes that Carve source cannot spell. The writer reports `structure-unspellable` or `field-unspellable` with the affected path instead of claiming a lossless round trip. See [the two gates](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#the-writer-and-its-two-gates) and [unspellable shapes](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md#shapes-that-carve-source-cannot-spell).

For a formatter integration, use `format` or `carve fmt` and read its diagnostics. The `normalize` option discards measured source spelling before writing; the default can retain the selected spelling facts in a source-layout sidecar. See [the sidecar](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#the-sidecar) and [formatter](https://github.com/markup-carve/carve/blob/next2/spec/0.2/writer.md#carve-fmt).
