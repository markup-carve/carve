---
page: edge-lists
---

## A quote plus after a quote-attached paragraph is a letter

CARVE-P9-067 (carve#5132). A quote's `+` attaches a paragraph written outside the quote prefix, and that paragraph is the quote's. A following `> +` continues the same quote, so its `+` stands at the quote's content column and is a letter, as in `> a` / `> +`.

At the end of input the `+` stays a letter in its own paragraph:

::: compare

````carve
> +
q
> +
````

```html
<blockquote>
  <p>q</p>
  <p>+</p>
</blockquote>
```

:::

A following line does not make it a marker; an unmarked line folds into its paragraph:

::: compare

````carve
> +
q
> +
r
````

```html
<blockquote>
  <p>q</p>
  <p>+
r</p>
</blockquote>
```

:::

A heading after it stands after the quote:

::: compare

````carve
> +
q
> +
# h
````

```html
<blockquote>
  <p>q</p>
  <p>+</p>
</blockquote>
<section id="h">
  <h1>h</h1>
</section>
```

:::
