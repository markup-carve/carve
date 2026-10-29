## Attribute block after a mention stays literal

Mentions and tags are inert stable spans that do not take attributes (they share the soft-break / hard-break / plain-text class in this respect). A `{…}` glued after one stays literal text rather than attaching or vanishing.

::: compare

```carve
@u{k=v.w}
```

```html
<p><span class="mention"><strong>@u</strong></span>{k=v.w}</p>
```

:::
