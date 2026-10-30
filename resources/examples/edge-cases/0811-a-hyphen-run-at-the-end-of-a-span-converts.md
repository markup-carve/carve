---
page: edge-inline
---

## A hyphen run at the end of a span converts

A span's closing delimiter is not content, so nothing follows a hyphen run at
the end of a span's content, as nothing follows one at the end of a paragraph.
The run converts under CARVE-P3-021, whatever the span's closer is
(markup-carve/carve#4260).

::: compare

```carve
*a --* b, /a --/ b, _a ---_ b, ~a --~ b and */a --/* b
```

```html
<p><strong>a –</strong> b, <em>a –</em> b, <u>a —</u> b, <s>a –</s> b and <strong><em>a –</em></strong> b</p>
```

:::

A braced span's content ends before its `X}` closer, and a run after a soft
break converts the same way.

::: compare

```carve
{*a --*} b and {=a ---=} b
*a
--* b
```

```html
<p><strong>a –</strong> b and <mark>a —</mark> b
<strong>a
–</strong> b</p>
```

:::

A run followed by a character that is not a closer still stays literal, and so
does a run at the start of a span.

::: compare

```carve
(a --) b, *a --x* b and *--x* b
```

```html
<p>(a --) b, <strong>a --x</strong> b and <strong>--x</strong> b</p>
```

:::
