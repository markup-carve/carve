---
page: edge-lists
---

## A comment fence line inside a braced comment run is run text

While a block `{%` run is open, each continuation past its `{` is text of the run, so a `%%%` line there opens no comment span. The run reads like its twin with a plain middle line, and a lazy line after its closer continues the item paragraph (CARVE-P2-035, PART 9 §28, carve#5853).

::: compare

```carve
- {% a
   %%%
   z %}
plain
```

```html
<ul>
  <li>
plain</li>
</ul>
```

:::

::: compare

```carve
1. {% a
    %%% x
    z %}
plain
```

```html
<ol>
  <li>
plain</li>
</ol>
```

:::

::: compare

```carve
- p
  {% a
   %%%
   z %}
plain
```

```html
<ul>
  <li>p

plain</li>
</ul>
```

:::
