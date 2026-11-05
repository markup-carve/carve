---
page: edge-inline
---

## A lazy braced comment uses source columns in every host

CARVE-P2-035 measures a lazy `{%` opener and its continuation in source columns after quote prefixes. At or left of the opener column the whole run is literal paragraph text; one column deeper continues an erased comment.

list, continuation at the opener column.

:::: compare

```carve
- pre
{% b
b %}
```

```html
<ul>
  <li>pre
{% b
b %}</li>
</ul>
```

::::

list, continuation one source column deeper.

:::: compare

```carve
- pre
{% b
 b %}
```

```html
<ul>
  <li>pre
</li>
</ul>
```

::::

quote, continuation at the opener column.

:::: compare

```carve
> pre
{% b
b %}
```

```html
<blockquote><p>pre
{% b
b %}</p></blockquote>
```

::::

quote, continuation one source column deeper.

:::: compare

```carve
> pre
{% b
 b %}
```

```html
<blockquote><p>pre
</p></blockquote>
```

::::

footnote, continuation at the opener column.

:::: compare

```carve
[^a]: pre
{% b
b %}

ref[^a]
```

```html
<p>ref<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>pre
{% b
b %}<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

footnote, continuation one source column deeper.

:::: compare

```carve
[^a]: pre
{% b
 b %}

ref[^a]
```

```html
<p>ref<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>pre
<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

div, continuation at the opener column.

:::: compare

```carve
::: note
pre
{% b
b %}
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>pre
{% b
b %}</p>
</aside>
```

::::

div, continuation one source column deeper.

:::: compare

```carve
::: note
pre
{% b
 b %}
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>pre
</p>
</aside>
```

::::
