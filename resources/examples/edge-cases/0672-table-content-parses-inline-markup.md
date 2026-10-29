## Table content parses inline markup

A leading `=` opens a data cell here. The `=hot=` inside it is a highlight.

::: compare

```carve
|=hot= |
```

```html
<table>
  <tbody>
    <tr><td><mark>hot</mark></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
|=warm= |
```

```html
<table>
  <tbody>
    <tr><td><mark>warm</mark></td></tr>
  </tbody>
</table>
```

:::
