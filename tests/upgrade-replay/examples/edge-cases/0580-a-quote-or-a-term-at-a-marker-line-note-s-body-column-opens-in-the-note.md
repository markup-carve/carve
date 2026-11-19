## A quote or a term at a marker-line note's body column opens in the note

A quote or a definition term at the note's body column opens inside the note.
The quote's paragraph, or the description's, is then the deepest open paragraph,
so `after [^n]` folds into it (PART 0 S4, markup-carve/carve#3885). The note is
referenced only from inside itself and renders nothing.

:::: compare

````carve
- [^n]: text
    > q
after [^n]
````

```html
<ul>
  <li></li>
</ul>
```

::::

:::: compare

````carve
- [^n]: text
    :: t
    : d
after [^n]
````

```html
<ul>
  <li></li>
</ul>
```

::::

:::: compare

````carve
- [^n]: text
   > q
after [^n]
````

```html
<ul>
  <li>
    <blockquote><p>q
after <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p></blockquote>
  </li>
</ul>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>text<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
