---
page: edge-attributes
---

## A class key-value splits into class tokens

A `class=V` value is a list of class tokens split on ASCII whitespace (CARVE-P4-007, carve#4205), so the class dedup compares tokens. A value with no token stays one empty entry, and each token is hardened on its own.

::: compare

```carve
{class="a b" .a}
para
```

```html
<p class="a b">para</p>
```

:::

::: compare

```carve
[x]{class="a b" .b}
```

```html
<p><span class="a b">x</span></p>
```

:::

::: compare

```carve
[x]{class="a  b a"}
```

```html
<p><span class="a b">x</span></p>
```

:::

::: compare

```carve
{.b}
{class="a b"}
para
```

```html
<p class="b a">para</p>
```

:::

::: compare

```carve
{class=""}
para
```

```html
<p class="">para</p>
```

:::

::: compare

```carve
{class="javascript:x y"}
para
```

```html
<p class="y">para</p>
```

:::
