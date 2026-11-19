## A verbatim run a continuation row opens stays open into the next continuation row

A `+` continuation extends the cell (CARVE-P2-019 rule 2). A verbatim run left open at a continuation row's closing pipe is still open when the next continuation row is cut into cells, so the pipes it spans there are its content, whichever column the run opened in.

::: compare

```carve
| a | b |
+ c` |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td>a c<code> x | y</code></td><td>b</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| a | b |
+ c` | d |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td>a c<code> | d x | y</code></td><td>b</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| a | b |
+ c | d` |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td>a c x</td><td>b d<code> y</code></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| a | b | c |
+ x | y` |
+ p | q | r |
```

```html
<table>
  <tbody>
    <tr><td>a x p</td><td>b y<code> q | r</code></td><td>c</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| a | b |
+ ``c |
+ x `` y | z |
```

```html
<table>
  <tbody>
    <tr><td>a <code>c x </code> y</td><td>b z</td></tr>
  </tbody>
</table>
```

:::
