---
page: edge-lists
---

## An outer plus host resumes after a quote holding a plus host

The quote is the outer host's one attached block, and the `+` inside it does not replace that attachment. After the quote ends, the outer host resumes at its content column (CARVE-P0-024).

::: compare

````carve
- +
> - +
> ```
> ```

  # outer
````

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>
          <pre><code></code></pre>
        </li>
      </ul>
    </blockquote>
    <h1 id="outer">outer</h1>
  </li>
</ul>
```

:::

::: compare

````carve
[^1]: +
> - +
> ```
> ```

  # outer

[^1]
````

```html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote>
        <ul>
          <li>
            <pre><code></code></pre>
          </li>
        </ul>
      </blockquote>
      <h1 id="outer">outer</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
