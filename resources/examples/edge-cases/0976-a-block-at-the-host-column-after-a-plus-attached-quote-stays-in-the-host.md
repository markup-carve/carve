---
page: edge-lists
---

## A block at the host column after a plus-attached quote stays in the host

A line without `>` that cannot fold into the quote's paragraph ends the quote (PART 0 S4). At the host's content column it belongs to the item, note or description (CARVE-P0-024).

::: compare

```carve
- +
> q
  # g
```

```html
<ul>
  <li>
    <blockquote><p>q</p></blockquote>
    <h1 id="g">g</h1>
  </li>
</ul>
```

:::

::: compare

```carve
- +
> q
  ::: w
  :::
```

```html
<ul>
  <li>
    <blockquote><p>q</p></blockquote>
    <div class="w">

    </div>
  </li>
</ul>
```

:::

::: compare

```carve
[^1]: +
> q
  # g

[^1]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>q</p></blockquote>
      <h1 id="g">g</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
:: t
: +
> q
  ::: w
  :::
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote><p>q</p></blockquote>
    <div class="w">

    </div>
  </dd>
</dl>
```

:::
