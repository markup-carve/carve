## An unclosed verbatim run in a row stops at the closing pipe

A `|` inside an open code span is cell content, not a separator — that is what
lets `` | a `x|` | b | `` be two cells. An unclosed run has no such reach: the
row's own closing pipe still closes the row, and the run stops there
(markup-carve/carve#1284).

::: compare

```carve
| a `b | c d |
```

```html
<table>
  <tbody>
    <tr><td>a <code>b | c d</code></td></tr>
  </tbody>
</table>
```

:::

It is a real row, so the table continues below it:

::: compare

```carve
| a `b | c d |
| e | f |
```

```html
<table>
  <tbody>
    <tr><td>a <code>b | c d</code></td></tr>
    <tr><td>e</td><td>f</td></tr>
  </tbody>
</table>
```

:::

The same under a header row, since nothing here depends on the row's position:

::: compare

```carve
|= h |
| a `b | c |
```

```html
<table>
  <thead>
    <tr><th scope="col">h</th></tr>
  </thead>
  <tbody>
    <tr><td>a <code>b | c</code></td></tr>
  </tbody>
</table>
```

:::

The run's delimiter length does not matter — an unclosed double-backtick run
behaves the same:

::: compare

```carve
| a ``b | c |
```

```html
<table>
  <tbody>
    <tr><td>a <code>b | c</code></td></tr>
  </tbody>
</table>
```

:::

The control, and the reason this is a narrow rule rather than "pipes always
split": a run that DOES close still hides the pipes inside it, so this row has
two cells and not three.

::: compare

```carve
| a `x|` | b |
```

```html
<table>
  <tbody>
    <tr><td>a <code>x|</code></td><td>b</td></tr>
  </tbody>
</table>
```

:::

And a line with content dangling after its last pipe is still prose, open run or
not — the closing-pipe requirement is unchanged.

::: compare

```carve
| a | b
```

```html
<p>| a | b</p>
```

:::
