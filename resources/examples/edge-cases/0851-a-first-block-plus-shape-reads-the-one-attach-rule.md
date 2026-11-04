---
page: edge-lists
---

## A first-block plus shape reads the one attach rule


Since markup-carve/carve#4860 a list marker opens a list in a list item, description body or footnote body and closes a body it misses, so the rows below that show a marker in such a body read that way.

CARVE-P9-067: a `+` attaches only at its innermost owner's marker column, and a refused `+` is a plain letter (carve#4409, carve#4396).

:::: compare

````carve
- - +
:: l
  x
````

```html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<dl>
  <dt>l</dt>
</dl>
<p>x</p>
```

::::

:::: compare

````carve
- a
  - +
 ```
x
```
````

```html
<ul>
  <li>a
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<pre><code>x
</code></pre>
```

::::

:::: compare

````carve
- - +
```
+
z

q
````

```html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<pre><code>+
z

q
</code></pre>
```

::::

:::: compare

````carve
- - +
```
+
z
````

```html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<pre><code>+
z
</code></pre>
```

::::

:::: compare

````carve
  - a
  +
  p
````

```html
<ul>
  <li>a
    p
  </li>
</ul>
```

::::

:::: compare

````carve
> :: t
> : +
para
````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd></dd>
  </dl>
  <p>para</p>
</blockquote>
```

::::

:::: compare

````carve
> [^b]: +
  > para

r[^b]
````

```html
<blockquote>

</blockquote>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>para<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

````carve
:: t
: [^q]: +
- y

r[^q]
````

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<ul>
  <li>y</li>
</ul>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

````carve
[^b]: +
 # H

r[^b]
````

```html
<section id="H">
  <h1>H</h1>
  <p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::
