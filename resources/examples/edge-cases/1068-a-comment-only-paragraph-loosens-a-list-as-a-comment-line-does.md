---
page: edge-lists
---

## A comment-only paragraph loosens a list as a comment line does

A paragraph holding only braced comments has the ownership effect of a `%%` line, so the blank before it loosens a list only where the blank before a `%%` line would. A code or colon fence line ends the paragraph as it ends a visible one (§10 I4), and a sibling marker after a nested item meets the blank behind it (PART 9 §17 L1, CARVE-P9-013, carve#5854).

::: compare

````carve
- x

  {% a z %}
```
````

```html
<ul>
  <li>x</li>
</ul>
<pre><code></code></pre>
```

:::

:::: compare

```carve
- x

  {% a
   z %}
::: x
```

```html
<ul>
  <li>x</li>
</ul>
<div class="x">

</div>
```

::::

::: compare

```carve
- a
  - x

    {% a z %}
- s
```

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>x</li>
    </ul>
  </li>
  <li><p>s</p></li>
</ul>
```

:::
