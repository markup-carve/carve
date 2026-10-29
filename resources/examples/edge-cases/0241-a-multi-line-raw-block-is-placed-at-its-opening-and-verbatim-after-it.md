## A multi-line raw block is placed at its opening and verbatim after it

A raw block's content reaches the target unchanged, so a renderer that indents its output indents the block's OPENING position - the way it would any other block - and leaves every line after the first on the columns the author gave it. The corpus pinned only a single-line raw block, which is the one shape where "indent the block" and "indent every line" agree, so three engines could pass it while giving three different answers here.

::: compare

```carve
[^a]: note

  ```=html
  <b>x</b>
  <i>y</i>
  ```

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <b>x</b>
<i>y</i>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Inside a `<pre>` the difference is CONTENT rather than layout: two columns added to each line change what the rendered code block says.

::: compare

```carve
> ```=html
> <pre>
> a
>   b
> </pre>
> ```
```

```html
<blockquote>
  <pre>
a
  b
</pre>
</blockquote>
```

:::
