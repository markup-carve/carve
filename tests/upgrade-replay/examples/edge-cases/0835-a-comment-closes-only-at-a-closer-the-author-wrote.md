---
page: edge-inline
---

## A comment closes only at a closer the author wrote

A `{%` with no `%}` after it is text, whatever unattached block follows it. A comment that renders nothing leaves the quote after it at the position before the comment, and that position is the comment's first `{%`, not one inside its body (CARVE-P3-023, carve#4317).

:::: compare

```carve
{%~{#i}
```

```html
<p>{%~{<span class="tag"><strong>#i</strong></span>}</p>
```

::::

:::: compare

```carve
{% ^{#i}*-}{#c#}
```

```html
<p>{% ^<span class="critic-comment">i}*-}{#c</span></p>
```

::::

:::: compare

```carve
`{%`^{#i .c}~{#c#}
```

```html
<p><code>{%</code>^<span class="critic-comment">i .c}~{#c</span></p>
```

::::

:::: compare

```carve
{%**a*{%z%}"
```

```html
<p>“</p>
```

::::
