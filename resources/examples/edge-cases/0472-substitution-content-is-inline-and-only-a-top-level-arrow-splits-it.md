## Substitution content is inline, and only a top-level arrow splits it

A `{~ … ~}` pair is a substitution when it holds a top-level `~>`. The search
skips verbatim content, so an arrow inside a code span, math, an inline literal
or a comment does not split the pair, and neither does an escaped one. A pair
with no top-level arrow is a forced strikethrough
(markup-carve/carve#2083). An unclosed run takes the rest of the block, so
`` {~`a~>b~} `` has no closer at all (markup-carve/carve#3973).

::: compare

```carve
{~`a~>b~}

{~a `x~>y` b~}

{~/old/~>/new/~}

{~a\~>b~}
```

```html
<p>{~<code>a~&gt;b~}</code></p>
<p><s>a <code>x~&gt;y</code> b</s></p>
<p><del><em>old</em></del><ins><em>new</em></ins></p>
<p><s>a~&gt;b</s></p>
```

:::

Math, an inline literal and an editorial comment are skipped the same way.

::: compare

```carve
{~$`a~>b`~>c~}

{~!`a~>b`~>c~}

{~a{# ~> #}b~>c~}
```

```html
<p><del><span class="math inline" role="math">\(a~&gt;b\)</span></del><ins>c</ins></p>
<p><del>a~&gt;b</del><ins>c</ins></p>
<p><del>a<span class="critic-comment"> ~&gt; </span>b</del><ins>c</ins></p>
```

:::
