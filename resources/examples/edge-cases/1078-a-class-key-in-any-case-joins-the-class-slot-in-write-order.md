---
page: edge-attributes
---

## A class key in any case joins the class slot in write order

A `class` key in any ASCII case is the class slot (CARVE-P4-007, PART 10 §1). Its tokens join the slot at the position they were written, between the `.` shorthands around them, and an AST JSON round trip keeps that order (carve#5991).

::: compare

```carve
[x](/u){.a CLASS=b .c}
```

```html
<p><a href="/u" class="a b c">x</a></p>
```

:::

::: compare

```carve
[x]{.a Class="b d" .c}
```

```html
<p><span class="a b d c">x</span></p>
```

:::

:::: compare

```carve
{CLASS=b .a}
:::
y
:::
```

```html
<div CLASS="b a">
  <p>y</p>
</div>
```

::::

:::: compare

```carve
{.a cLaSs=b #i CLASS=d .c k=v}
:::
y
:::
```

```html
<div class="a b d c" id="i" k="v">
  <p>y</p>
</div>
```

::::
