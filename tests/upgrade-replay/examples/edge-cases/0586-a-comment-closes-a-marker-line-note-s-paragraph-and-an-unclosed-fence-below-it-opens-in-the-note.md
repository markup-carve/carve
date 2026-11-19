## A comment closes a marker-line note's paragraph, and an unclosed fence below it opens in the note

The comment closes the note's open paragraph (PART 0 T), so the unclosed fence opens a code block in the note. A fenced body holds no open paragraph (CARVE-P0-013), so the column-0 line below is a document paragraph, with or without a blank before the comment.

:::: compare

````carve
- [^n]: text
    more
    %% c
    ~~~
    code
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
      <p>text
more</p>
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
    more

    %% c
    ~~~
    code
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
      <p>text
more</p>
      <pre><code>code
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
