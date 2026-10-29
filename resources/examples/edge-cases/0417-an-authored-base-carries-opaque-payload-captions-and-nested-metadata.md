## An authored base carries opaque payload, captions, and nested metadata

An authored block base belongs to the whole structural group. An opaque fence
payload is never scanned again for block openers, a caption moves with its
target, and a nested footnote definition keeps both its body and its surrounding
container ownership.

::: compare

```carve
[^n]: intro

   ~~~~
    ```
   ~~~~

see[^n]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <pre><code> ```
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^n]: intro

    ![alt](image.png)
    ^ Caption

see[^n]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <figure>
        <img src="image.png" alt="alt">
        <figcaption>Caption</figcaption>
      </figure>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^n]: intro

   ::: >
   > quote
   :::

see[^n]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <blockquote>
        <blockquote><p>quote</p></blockquote>
      </blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^outer]: intro

     [^inner]: note

     see[^inner]

see[^outer]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <p>see<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>note<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
