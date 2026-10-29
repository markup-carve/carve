## A heading reference folds Unicode normalization, but not compatibility

The heading index is keyed on rendered plain text (PART 9R R1): trimmed, internal whitespace collapsed, NFC-normalized, then compared exactly. NFC has to be in that list because the ID side already normalizes (§25) - without it a document publishes `id="Café"` and then declines `[Café][]` against the very heading that produced it, and the two spellings look identical on screen so the miss has no visible cause. The heading below is written `Cafe` + U+0301 and the reference is precomposed U+00E9.

Compatibility folding is NOT in the list: `[file][]` does not reach `# ﬁle`. NFKC would change which text the author is quoting rather than how it is spelled. carve-rs folded NFC and the other three did not (carve#725).

::: compare

```carve
# Café

see [Café][] and [file][]

# ﬁle
```

```html
<section id="Café">
  <h1>Café</h1>
  <p>see <a href="#Café">Café</a> and [file][]</p>
</section>
<section id="ﬁle">
  <h1>ﬁle</h1>
</section>
```

:::
