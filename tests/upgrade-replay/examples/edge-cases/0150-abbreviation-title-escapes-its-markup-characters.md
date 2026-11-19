## Abbreviation title escapes its markup characters

An abbreviation's expansion becomes the `title` attribute, so `&`, `<`, `>` and `"` in it are entity-escaped like any attribute value.

::: compare

```carve
*[HTML]: Hyper & Text < Markup > "quoted"

The HTML spec.
```

```html
<p>The <abbr title="Hyper &amp; Text &lt; Markup &gt; &quot;quoted&quot;">HTML</abbr> spec.</p>
```

:::
