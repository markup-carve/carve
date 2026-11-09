---
page: edge-lists
---

## A description's own-line plus fence keeps its trailing blank

PART 0 S1 step 3 ends an unclosed fence at its first blank only after a marker-line `+`. A fence an own-line `+` attached in a description reads like any fence in the description's body, so its trailing blank is payload, as in a note (PART 9 §17 L4, carve#5560).

::: compare

````carve
:: t
: p
+
```
code

  tail

x
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>p</p>
    <pre><code>code

tail

</code></pre>
  </dd>
</dl>
<p>x</p>
```

:::

::: compare

````carve
:: t
: n
+
```
a
  b

see
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>n</p>
    <pre><code>a
  b

</code></pre>
  </dd>
</dl>
<p>see</p>
```

:::
