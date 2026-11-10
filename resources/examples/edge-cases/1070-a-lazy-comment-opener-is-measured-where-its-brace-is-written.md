---
page: edge-lists
---

## A lazy comment opener is measured where its brace is written

A `{%` opener indented short of its host's body column is a lazy line, and its `{` is measured where it is written. A continuation that carries the host's indentation, reaches its body column and passes that `{` keeps the run valid, so it renders nothing (CARVE-P2-035, carve#5830, carve#5874). A leading tab is measured in each frame's coordinates (carve#5755): in the last case the opener reaches the description body at column 6 and the closer at column 5 misses it, so the run is refused.

::: compare

```carve
- b
 {% x
  %}
```

```html
<ul>
  <li>b
</li>
</ul>
```

:::

::: compare

```carve
- a
  - b
 {% x
    %}
```

```html
<ul>
  <li>a
    <ul>
      <li>b
</li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
[^n]: p
 {% x
  %}

x[^n]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>p
<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^n]: p
    :: t
    : pre
  	{% x
     %}

x[^n]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>p</p>
      <dl>
        <dt>t</dt>
        <dd>pre
{% x
%}</dd>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
