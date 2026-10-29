## An autolink or a cross-reference is atomic to brackets and braces

PART 8 resolves an autolink or a cross-reference before links and emphasis, so
a `[` inside one opens no bracket run: the parenthesis after a later `]` is no
destination, and emphasis pairs across it. A braced closer inside a
cross-reference cannot close a forced span opened before it (PART 9 §9 E2a).

::: compare

```carve
<https://a[> *q](u*) z
```

```html
<p><a href="https://a[">https://a[</a> <strong>q](u</strong>) z</p>
```

:::

::: compare

```carve
</#a[> *q](u*) z
```

```html
<p>&lt;/#a[&gt; <strong>q](u</strong>) z</p>
```

:::

::: compare

```carve
{*a </#x*}> b*}
```

```html
<p><strong>a &lt;/#x*}&gt; b</strong></p>
```

:::
