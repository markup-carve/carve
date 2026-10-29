## A second plus starts its own paragraph after attachment

::: compare

```carve
> q
+
+
```

```html
<blockquote>
  <p>q</p>
  <p>+</p>
</blockquote>
```

:::

::: compare

```carve
- q
+
+

- r
```

```html
<ul>
  <li><p>q</p>
    <p>+</p>
  </li>
  <li><p>r</p></li>
</ul>
```

:::

::: compare

```carve
:: t
: q
+
+
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>q</p>
    <p>+</p>
  </dd>
</dl>
```

:::

::: compare

```carve
[^a]: q
+
+

ref [^a]
```

```html
<p>ref <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>q</p>
      <p>+<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
