---
page: edge-inline
---

## An escaped space and a hard break work inside a forced span

A forced span holds its own delimiter literal (PART 9 §22), and nothing else.
An escaped space is still a non-breaking space inside it, and a backslash at
the end of a line is still a hard break (PART 3, markup-carve/carve#4266).

::: compare

```carve
{=\ x=}, {_a \ b_} and {*a\
b*}
```

```html
<p><mark>&nbsp;x</mark>, <u>a &nbsp;b</u> and <strong>a<br>
b</strong></p>
```

:::

An escaped delimiter is still literal, so `\=` does not close the span.

::: compare

```carve
{=a\ =} and {=a\=}
```

```html
<p><mark>a&nbsp;</mark> and {=a=}</p>
```

:::
