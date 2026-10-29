## A comment in a marker-line note changes nothing

A comment is invisible at any column (CARVE-P9-053); at the note's content column it retains nothing (PART 0 X1).

:::: compare

````carve
- [^n]: text
    %% c
    ```
    code
    ```
after [^n]
````

```html
<ul>
  <li></li>
</ul>
<p>after <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>text</p>
      <pre><code>code
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

````carve
- [^n]: text

    %% c
    ```
    code
    ```
after [^n]
````

```html
<ul>
  <li></li>
</ul>
<p>after <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>text</p>
      <pre><code>code
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
