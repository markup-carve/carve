---
page: edge-inline
---

## A note body and an extension's content hold a comment's run

A `%%` that starts a note's body is a comment, and it ends at the closing `]`. The comment text is never published.

::: compare

```carve
^[%% c] d
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> d</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
^[a %% c] d
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> d</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

An extension's content holds a run the same way, and so does a bracket run that stays literal.

::: compare

```carve
:foo[%% c] d
```

```html
<p><span class="ext-foo"></span> d</p>
```

:::

::: compare

```carve
:foo[a %% c] d
```

```html
<p><span class="ext-foo">a</span> d</p>
```

:::

::: compare

```carve
[a %% c] d
```

```html
<p>[a] d</p>
```

:::
