## A closed fence at a marker-line note's body column opens in the note

A closed fence at the note's body column belongs to the note, even after a
child list. A fence below that column belongs to the outer item (PART 0
DEFINITION EXTENT, CARVE-P9-083).

:::: compare

````carve
- [^n]: text
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
- [^n]: %% c
    - child
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
      <ul>
        <li>child</li>
      </ul>
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
- [^n]: %% c
    - child
   ```
   code
   ```
after [^n]
````

```html
<ul>
  <li>
    <pre><code>code
</code></pre>
  </li>
</ul>
<p>after <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>child</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
