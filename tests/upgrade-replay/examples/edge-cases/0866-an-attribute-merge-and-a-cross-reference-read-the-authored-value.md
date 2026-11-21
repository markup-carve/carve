---
page: edge-attributes
---

## An attribute merge and a cross-reference read the authored value

Confirmation-round model fixes (carve#4563, carve#4565, carve#4567, carve#4572, carve#4574). An HTML attribute name written twice is emitted once with the last value, a boolean included (PART 9 §19). Alignment converts on every `<div>`. A cross-reference looks up the authored id, NFC-normalized, and its link holds no link (PART 9R R4).

A caption id that needs attribute escaping still resolves.

:::::: compare

`````carve
{id="a&b"}
| a |
^ T #: c

</#a&b>
`````

```html
<table id="a&amp;b">
  <caption>T 1: c</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<p><a href="#a&amp;b">T 1</a></p>
```

::::::

A boolean `align` after a valued one wins the merge, and its empty value converts to nothing.

:::::: compare

`````carve
{align=right align}
p
`````

```html
<p align="">p</p>
```

::::::

A valued `align` after a boolean one converts at the first slot.

:::::: compare

`````carve
{align align=right}
p
`````

```html
<p style="text-align: right;">p</p>
```

::::::

A boolean `style` merges with the earlier `style` before the declaration is appended.

:::::: compare

`````carve
{style=a style align=left}
p
`````

```html
<p style="text-align: left;">p</p>
```

::::::

A line block converts `align` like any `<div>`.

:::::: compare

`````carve
{align=left}
::: |
a
:::
`````

```html
<div style="text-align: left;" class="line-block">
  <p>a</p>
</div>
```

::::::

A hard-break div appends the declaration to an authored `style`.

:::::: compare

`````carve
{style=x align=left}
::: \
a
:::
`````

```html
<div style="x; text-align: left;" class="hardbreaks">
  <p>a</p>
</div>
```

::::::

A heading's own link renders its content only inside the cross-reference.

:::::: compare

`````carve
# [l](/u) t

</#l-t>
`````

```html
<section id="l-t">
  <h1><a href="/u">l</a> t</h1>
  <p><a href="#l-t">l t</a></p>
</section>
```

::::::

A reference link in the heading flattens to its text.

:::::: compare

`````carve
# [l][r] t

[r]: /u

</#l-t>
`````

```html
<section id="l-t">
  <h1><a href="/u">l</a> t</h1>
  <p><a href="#l-t">l t</a></p>
</section>
```

::::::

A reference spelled with a combining accent reaches the heading written the same way.

:::::: compare

`````carve
# Café

</#Café>
`````

```html
<section id="Café">
  <h1>Café</h1>
  <p><a href="#Café">Café</a></p>
</section>
```

::::::
