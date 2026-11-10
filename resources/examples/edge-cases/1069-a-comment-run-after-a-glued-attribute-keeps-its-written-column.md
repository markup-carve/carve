---
page: edge-lists
---

## A comment run after a glued attribute keeps its written column

A marker-glued attribute does not move a later brace on the marker line (carve#5788), and a `{%` run is measured from its written `{` as an attribute run is. A continuation at or left of that column refuses the run, so it stays paragraph text (CARVE-P2-035, carve#5830, carve#5863).

::: compare

```carve
-{.g} {% b
   b %}
```

```html
<ul>
  <li class="g">{% b
b %}</li>
</ul>
```

:::

::: compare

```carve
> 1.{#i} {% b
>    b %}
```

```html
<blockquote>
  <ol>
    <li id="i">{% b
b %}</li>
  </ol>
</blockquote>
```

:::

::: compare

```carve
-{.g} {% b
       b %}
```

```html
<ul>
  <li class="g"></li>
</ul>
```

:::
