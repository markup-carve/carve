---
page: edge-definitions
---

## An abbreviation definition below a content column stands in the document

A definition line that misses every frame defines at every column below the
content column, not only at column 0 (carve#4412).

One column in, below an item.

::::::: compare

````carve
- n
 *[A]: b

A
````

````html
<ul>
  <li>n</li>
</ul>
<p><abbr title="b">A</abbr></p>
````

:::::::

A wider content column leaves more columns between.

::::::: compare

````carve
10. n
   *[A]: b

A
````

````html
<ol start="10">
  <li>n</li>
</ol>
<p><abbr title="b">A</abbr></p>
````

:::::::

A nested list closes with its parent.

::::::: compare

````carve
- - n
 *[A]: b

A
````

````html
<ul>
  <li>
    <ul>
      <li>n</li>
    </ul>
  </li>
</ul>
<p><abbr title="b">A</abbr></p>
````

:::::::

A description ends the same way.

::::::: compare

````carve
:: t
: n
 *[A]: b

A
````

````html
<dl>
  <dt>t</dt>
  <dd>n</dd>
</dl>
<p><abbr title="b">A</abbr></p>
````

:::::::

A wider description body leaves more columns between.

::::::: compare

````carve
:: t
:  n
  *[A]: b

A
````

````html
<dl>
  <dt>t</dt>
  <dd>n</dd>
</dl>
<p><abbr title="b">A</abbr></p>
````

:::::::

A note ends the same way.

::::::: compare

````carve
[^f]: n
 *[A]: b

A[^f]
````

````html
<p><abbr title="b">A</abbr><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::::::

At a wide content column the line reaches the item and stays its text.

::::::: compare

````carve
10. n
    *[A]: b

A
````

````html
<ol start="10">
  <li>n
*[A]: b</li>
</ol>
<p>A</p>
````

:::::::

A line that reaches an outer item stays text in the inner one.

::::::: compare

````carve
- - n
  *[A]: b

A
````

````html
<ul>
  <li>
    <ul>
      <li>n
*[A]: b</li>
    </ul>
  </li>
</ul>
<p>A</p>
````

:::::::

A line at a note's body column stays its text.

::::::: compare

````carve
[^f]: n
  *[A]: b

A[^f]
````

````html
<p>A<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n
*[A]: b<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::::::
