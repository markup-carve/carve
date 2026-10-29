## An ordered list carries its authored delimiter

CARVE-P10-014 writes the recorded `delim` as `data-delim` on the `<ol>`, a
structural attribute trailing `type` and `start` and leading the authored ones.
The default `.` is absent from the AST and emits nothing, and a nested list
derives the attribute from its own marker.

::: compare

```carve
1) first
2) second
```

```html
<ol data-delim=")">
  <li>first</li>
  <li>second</li>
</ol>
```

:::

::: compare

```carve
1. first
2. second
```

```html
<ol>
  <li>first</li>
  <li>second</li>
</ol>
```

:::

::: compare

```carve
c) gamma
d) delta
```

```html
<ol type="a" start="3" data-delim=")">
  <li>gamma</li>
  <li>delta</li>
</ol>
```

:::

::: compare

```carve
{k=v .attr}
1) first
```

```html
<ol data-delim=")" k="v" class="attr">
  <li>first</li>
</ol>
```

:::

::: compare

```carve
1. outer

   1) inner
```

```html
<ol>
  <li>outer
    <ol data-delim=")">
      <li>inner</li>
    </ol>
  </li>
</ol>
```

:::
