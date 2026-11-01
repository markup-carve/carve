## Tag requires a word boundary

`#` starts a tag only at a word boundary; `foo#bar` is literal text.

::: compare

```carve
A #tag here, but not in foo#bar.
```

```html
<p>A <span class="tag"><strong>#tag</strong></span> here, but not in foo#bar.</p>
```

:::

A tag name needs at least one ASCII letter (carve#4809), so `#123` stays literal text while `#v2` is a tag. The letter may stand anywhere in the name.

::: compare

```carve
Issue #123 and #v2 here.
```

```html
<p>Issue #123 and <span class="tag"><strong>#v2</strong></span> here.</p>
```

:::
