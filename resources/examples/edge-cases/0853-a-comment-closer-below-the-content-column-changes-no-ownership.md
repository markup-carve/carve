---
page: edge-lists
---

## A comment closer below the content column changes no ownership

CARVE-P0-005 and PART 9 §10 I5 (carve#4086). A matched `%%%` span is one extent across authored indentation and closes the open paragraph, so a line short of the content column leaves the container.

:::: compare

````carve
- a
  %%%
  hidden
%%%
 x
````

```html
<ul>
  <li>a</li>
</ul>
<p>x</p>
```

::::

:::: compare

````carve
- a
  %%%
  hidden
  %%%
 x
````

```html
<ul>
  <li>a</li>
</ul>
<p>x</p>
```

::::

:::: compare

````carve
- a
  - %%%
    hidden
%%%
 { - x
````

```html
<ul>
  <li>a
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>{ - x</p>
```

::::

:::: compare

````carve
[^n]: a
  %%%
  hidden
%%%
x

r[^n]
````

```html
<p>x</p>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
