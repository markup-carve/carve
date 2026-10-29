## Heading-index plain text covers visible leaves and rejects an empty key

The heading index uses the same rendered-plain-text projection on both sides.
Autolink display text and image alternative text are visible leaves and remain;
symbols and footnote references are the named exclusions. Resolving the outer
link does not flatten a parsed non-link tag span. When all content is excluded,
the heading still receives the fallback id `s`, but no empty index key exists.

::: compare

```carve
# a <https://e.com> b

[a <https://e.com> b][]
```

```html
<section id="a-https-e-com-b">
  <h1>a <a href="https://e.com">https://e.com</a> b</h1>
  <p><a href="#a-https-e-com-b">a https://e.com b</a></p>
</section>
```

:::

::: compare

```carve
# a ![alt](/i.png) b

[a ![alt](/i.png) b][]
```

```html
<section id="a-alt-b">
  <h1>a <img src="/i.png" alt="alt"> b</h1>
  <p><a href="#a-alt-b">a <img src="/i.png" alt="alt"> b</a></p>
</section>
```

:::

::: compare

```carve
# a &#65; b

[a &#65; b][]
```

```html
<section id="a-65-b">
  <h1>a &amp;<span class="tag"><strong>#65</strong></span>; b</h1>
  <p><a href="#a-65-b">a &amp;<span class="tag"><strong>#65</strong></span>; b</a></p>
</section>
```

:::

::: compare

```carve
# :smile:

[:smile:][]
```

```html
<section id="s">
  <h1>:smile:</h1>
  <p>[:smile:][]</p>
</section>
```

:::
