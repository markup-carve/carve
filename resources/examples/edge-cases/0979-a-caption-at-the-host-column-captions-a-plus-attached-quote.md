---
page: edge-lists
---

## A caption at the host column captions a plus-attached quote

A caption line is no lazy continuation (PART 0 S4). At the host's content column it follows the attached quote in the host and captions it.

::: compare

```carve
- +
> q
  ^ cap
```

```html
<ul>
  <li>
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </li>
</ul>
```

:::

::: compare

```carve
[^1]: +
> q
  ^ cap

[^1]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <figure>
        <blockquote><p>q</p></blockquote>
        <figcaption>cap</figcaption>
      </figure>
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
  ^ cap
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </dd>
</dl>
```

:::
