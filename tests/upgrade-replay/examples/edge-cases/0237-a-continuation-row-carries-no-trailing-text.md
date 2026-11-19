## A continuation row carries no trailing text

The `+` continuation marker replaces the leading pipe, and the row must close with one. A proper continuation merges into the row above; text after the closing pipe leaves the line outside the table entirely.

::: compare

```carve
| a | b |
+ c | d |
```

```html
<table>
  <tbody>
    <tr><td>a c</td><td>b d</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| a | b |
+ c | d | junk
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
<p>+ c | d | junk</p>
```

:::
