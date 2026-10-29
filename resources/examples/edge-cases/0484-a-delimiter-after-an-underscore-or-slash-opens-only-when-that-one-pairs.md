## A delimiter after an underscore or slash opens only when that one pairs

A delimiter never opens directly after `_`, nor `/` or `_` directly after `/`,
unless that `_` or `/` is an open entry where the delimiter stands
(CARVE-P3-013, markup-carve/carve#3973). Whether the guard closes later does
not matter, so a guard at the start of a line lets the delimiter after it open
and stays text itself, whatever the delimiter.

::: compare

```carve
_*x* q

_/x/ q

/_x_ q

_~x~ q

_=x= q
```

```html
<p>_<strong>x</strong> q</p>
<p>_<em>x</em> q</p>
<p>/<u>x</u> q</p>
<p>_<s>x</s> q</p>
<p>_<mark>x</mark> q</p>
```

:::

The same after a space in mid-line.

::: compare

```carve
a _*x* q
```

```html
<p>a _<strong>x</strong> q</p>
```

:::

CONTROL. A guard that pairs closes its own span around the inner one, so the spans nest.

::: compare

```carve
_*x*_ q

/_x_/ q

_*x* y_ q
```

```html
<p><u><strong>x</strong></u> q</p>
<p><em><u>x</u></em> q</p>
<p><u><strong>x</strong> y</u> q</p>
```

:::

An unpaired guard leaves no open strong span to hold a forced one literal.

::: compare

```carve
_*{*x*} q
```

```html
<p>_*<strong>x</strong> q</p>
```

:::

A caption's `#` placeholder inside the span after a guard is literal.

::: compare

```carve
![p](p.png)
^ Figure _*# x* q
```

```html
<figure>
  <img src="p.png" alt="p">
  <figcaption>Figure _<strong># x</strong> q</figcaption>
</figure>
```

:::

Settling the guard does not move the quotes after it. The apostrophe follows a
straight quote, so it closes.

::: compare

```carve
_*x* \"'a' "
```

```html
<p>_<strong>x</strong> "’a’ “</p>
```

:::
