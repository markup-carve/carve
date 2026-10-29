## An editorial comment's bracket is content, not the close

The close scan skips the interior of every span whose content is LITERAL:
inline code, the `!`-prefixed inline literal, and an editorial comment. The
test is the property, not the list - a `]` inside any of them cannot be
escaped, so ending the run there would leave no spelling that keeps both the
construct and the author's text.

A comment with no bracket in it never had a say in where the run ends.

::: compare

```carve
a [t{# n #}z](/u) b
```

```html
<p>a <a href="/u">t<span class="critic-comment"> n </span>z</a> b</p>
```

:::

One with a bracket in it does not either, in a link, in a span, in an inline
note, or in an alt text.

::: compare

```carve
a [t{# ] #}z]{.c} b
```

```html
<p>a <span class="c">t<span class="critic-comment"> ] </span>z</span> b</p>
```

:::

::: compare

```carve
a ^[t{# ] #}z] b
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t<span class="critic-comment"> ] </span>z<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a ![t{# ] #}z](/i.png) b
```

```html
<p>a <img src="/i.png" alt="t{# ] #}z"> b</p>
```

:::
