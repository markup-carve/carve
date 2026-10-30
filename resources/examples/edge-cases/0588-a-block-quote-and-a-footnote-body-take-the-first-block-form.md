## A block quote and a footnote body take the first-block form

`> +` and `[^a]: +` over a flush-left block open a body that is that one block,
the same reach as `- +` and `:  +` (§17 L4, markup-carve/carve#3105). With no
flush-left block after it, the `+` stays the container's text.

A table under `> +` is the quote's body.

::: compare

```carve
> +
|= 2-col header | < |= header |
```

```html
<blockquote>
  <table>
    <thead>
      <tr><th scope="col" colspan="2">2-col header</th><th scope="col">header</th></tr>
    </thead>
  </table>
</blockquote>
```

:::

A paragraph under `> +` is the quote's paragraph, not a fold into `+`.

::: compare

```carve
> +
flush
```

```html
<blockquote><p>flush</p></blockquote>
```

:::

At the end of the input the `+` is the quote's text.

::: compare

```carve
> +
```

```html
<blockquote><p>+</p></blockquote>
```

:::

A blank line next gives the same answer, and the line after the blank is a
top-level paragraph.

::: compare

```carve
> +

after
```

```html
<blockquote><p>+</p></blockquote>
<p>after</p>
```

:::

A nested quote's follower needs the outer quote's prefix. The fence has none, so
the `+` stays the inner quote's text and the fence stands outside (carve#4409).

::: compare

````carve
> > +
```
x
```
````

```html
<blockquote>
  <blockquote><p>+</p></blockquote>
</blockquote>
<pre><code>x
</code></pre>
```

:::

A fence under `[^a]: +` is the note's body.

::: compare

````carve
[^a]: +
```
x
```

see[^a]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <pre><code>x
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A note whose `+` ends the input holds the text `+`.

::: compare

```carve
see[^a]

[^a]: +
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

So does a note with a blank line next.

::: compare

```carve
[^a]: +

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>+<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
