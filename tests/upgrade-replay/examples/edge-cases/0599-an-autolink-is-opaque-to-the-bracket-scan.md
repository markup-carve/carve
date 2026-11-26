## An autolink is opaque to the bracket scan

The bracket scan skips an autolink whole (CARVE-P3-001), so a `]` inside one
cannot close a label opened before it: the link keeps the autolink as text. An
email address cannot hold a `]`, so its row pins the plain case. A `<` that
opens no autolink is no boundary, and its `]` closes the label.

::: compare

```carve
[a <https://x]> b](u)
```

```html
<p><a href="u">a https://x] b</a></p>
```

:::

::: compare

```carve
[a <me@x.org> b](u)
```

```html
<p><a href="u">a me@x.org b</a></p>
```

:::

::: compare

```carve
[a <x]> b](u)
```

```html
<p>[a &lt;x]&gt; b](u)</p>
```

:::
