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

A tag name may be all digits, so `#123` is a tag (not literal) — `Issue #123` tags the number. Only a leading word boundary is required, not a leading letter.

::: compare

```carve
Issue #123 and #v2 here.
```

```html
<p>Issue <span class="tag"><strong>#123</strong></span> and <span class="tag"><strong>#v2</strong></span> here.</p>
```

:::
