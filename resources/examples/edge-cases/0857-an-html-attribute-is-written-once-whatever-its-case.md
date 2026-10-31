---
page: edge-attributes
---

## An HTML attribute is written once, whatever its case

A value the element derives from its own marker wins, and the authored copy of that name is omitted (PART 10 §1).

::: compare

```carve
{type=text}
a. alpha
```

```html
<ol type="a">
  <li>alpha</li>
</ol>
```

:::

::: compare

```carve
{start=9}
3. x
```

```html
<ol start="3">
  <li>x</li>
</ol>
```

:::

::: compare

```carve
![a](/u.png){alt=z}
```

```html
<img src="/u.png" alt="a">
```

:::

::: compare

```carve
[a](/u "T"){TITLE=t}
```

```html
<p><a href="/u" title="T">a</a></p>
```

:::

An attribute the element does not derive stays authored.

::: compare

```carve
{start=9}
1. x
```

```html
<ol start="9">
  <li>x</li>
</ol>
```

:::

Names compare ASCII case-insensitively: the first spelling and position, the last value.

::: compare

```carve
{K=1 k=2}
para
```

```html
<p K="2">para</p>
```

:::

The `class` and `id` slots fold the same way.

:::: compare

```carve
{CLASS=z}
::: |
verse
:::
```

```html
<div CLASS="z line-block">
  <p>verse</p>
</div>
```

::::

::: compare

```carve
[x]{.a CLASS=b ID=c #d}
```

```html
<p><span class="a b" ID="d">x</span></p>
```

:::

A cell merges its alignment into an authored `style`.

::: compare

```carve
|>{style="color:red"} a |
```

```html
<table>
  <tbody>
    <tr><td style="color:red; text-align: right;">a</td></tr>
  </tbody>
</table>
```

:::
