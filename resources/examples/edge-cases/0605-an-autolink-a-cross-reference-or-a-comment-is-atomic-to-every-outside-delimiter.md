## An autolink, a cross-reference or a comment is atomic to every outside delimiter

An autolink, a cross-reference and a comment are atomic (PART 9 §9 E2a): no
delimiter, closer, substitution arrow or bracket outside one reads inside it.
A `~>` that ends an autolink or a cross-reference supplies no arrow, so the
pair is a strikethrough unless a later arrow stands outside them; an address
cannot end in `~`, so `<me@x.org~` is no autolink and its arrow splits. An
editorial or delimited comment hides an insertion or deletion closer. A comment
opened first is the outer construct, and its own first closer ends it. The
bracket scan skips a cross-reference and a delimited comment the way it skips an
autolink (CARVE-P3-001), so each label below closes at its last `]`.

::: compare

```carve
{~a <https://x~>y> b~}
```

```html
<p><s>a <a href="https://x~">https://x~</a>y&gt; b</s></p>
```

:::

::: compare

```carve
{~a <https://x~>y~>z b~}
```

```html
<p><del>a <a href="https://x~">https://x~</a>y</del><ins>z b</ins></p>
```

:::

::: compare

```carve
{~a </#x~> b~}
```

```html
<p><s>a &lt;/#x~&gt; b</s></p>
```

:::

::: compare

```carve
{~a <me@x.org~>y> b~}
```

```html
<p><del>a &lt;me@x.org</del><ins>y&gt; b</ins></p>
```

:::

::: compare

```carve
{+a {#x+}#} b+}
```

```html
<p><ins>a <span class="critic-comment">x+}</span> b</ins></p>
```

:::

::: compare

```carve
{-a {#x-}#} b-}
```

```html
<p><del>a <span class="critic-comment">x-}</span> b</del></p>
```

:::

::: compare

```carve
{+a {%x+}%} b+}
```

```html
<p><ins>a  b</ins></p>
```

:::

::: compare

```carve
{#a </#x#}> b#}
```

```html
<p><span class="critic-comment">a &lt;/#x</span>&gt; b#}</p>
```

:::

::: compare

```carve
[a </#x]> b](u)
```

```html
<p><a href="u">a &lt;/#x]&gt; b</a></p>
```

:::

::: compare

```carve
[a </#x]> b]{.c}
```

```html
<p><span class="c">a &lt;/#x]&gt; b</span></p>
```

:::

::: compare

```carve
![a </#x]> b](u)
```

```html
<img src="u" alt="a &lt;/#x]&gt; b">
```

:::

::: compare

```carve
[a </#x](u)> b](v)
```

```html
<p><a href="v">a &lt;/#x](u)&gt; b</a></p>
```

:::

::: compare

```carve
[a {%x]%} b](u)
```

```html
<p><a href="u">a  b</a></p>
```

:::

::: compare

```carve
^[a </#x]> b]
```

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a &lt;/#x]&gt; b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
