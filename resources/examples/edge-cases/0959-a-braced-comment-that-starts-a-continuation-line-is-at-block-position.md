---
page: edge-inline
---

## A braced comment that starts a continuation line is at block position

A `{%` that starts a continuation line of an open paragraph is at block position, so CARVE-P2-035 applies: every later line of the run, the `%}` closer included, must be indented past the opening `{`. Otherwise the whole run is literal paragraph text, in the root, a list item and a quote alike (PART 9 §21a, CARVE-P9-042, carve#5189). Indented past the `{`, the run is a comment and renders nothing.

::: compare

```carve
pre
{% a
b %}
```

```html
<p>pre
{% a
b %}</p>
```

:::

::: compare

```carve
- pre
  {% a
  b %}
```

```html
<ul>
  <li>pre
{% a
b %}</li>
</ul>
```

:::

::: compare

```carve
> pre
> {% a
> b %}
```

```html
<blockquote><p>pre
{% a
b %}</p></blockquote>
```

:::

::: compare

```carve
pre
{% a
  b %}
```

```html
<p>pre
</p>
```

:::
