## A bare closer does not reach inside a link destination

A link destination and an autolink are opaque to a bare delimiter (PART 9 §9
E2a), so the slashes of a URL cannot close emphasis opened before the link.

::: compare

```carve
/see [x](http://a.b/c) now/
```

```html
<p><em>see <a href="http://a.b/c">x</a> now</em></p>
```

:::

::: compare

```carve
/see <http://a.b/c> now/
```

```html
<p><em>see <a href="http://a.b/c">http://a.b/c</a> now</em></p>
```

:::
