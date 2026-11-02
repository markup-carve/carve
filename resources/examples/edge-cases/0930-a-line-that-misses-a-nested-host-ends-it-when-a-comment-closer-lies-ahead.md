---
page: edge-lists
---

## A line that misses a nested host ends it when a comment closer lies ahead

PART 0 S1 and the RECOVERY DECISION TABLE (CARVE-P0-005, carve#4770). The closer search reaches past every enclosing host, so a line that misses only a nested item, quote, description or note ends that host when an exact-width closer comes later in the document, and the line lands in the enclosing container. The opener is then a `%%` line within the shortened host. Without a closer the line folds into the paragraph, and a quote's search still stops at a blank line.

::::: compare

````carve
. a
  . %%%
    n
  zz
%%%
````

```html
<ol>
  <li>a
    <ol>
      <li>n</li>
    </ol>
    zz
  </li>
</ol>
```

:::::

::::: compare

````carve
. a
  . %%%
    n
  zz
````

```html
<ol>
  <li>a
    <ol>
      <li>n
zz</li>
    </ol>
  </li>
</ol>
```

:::::

::::: compare

````carve
- a
  > %%%
  > n
  zz
%%%
````

```html
<ul>
  <li>a
    <blockquote><p>n</p></blockquote>
    zz
  </li>
</ul>
```

:::::

::::: compare

````carve
- a
  > %%%
  > n
  zz

%%%
````

```html
<ul>
  <li>a
    <blockquote><p>n
zz</p></blockquote>
  </li>
</ul>
```

:::::

::::: compare

````carve
- a
  :: u
  : %%%
    n
  zz
%%%
````

```html
<ul>
  <li>a
    <dl>
      <dt>u</dt>
      <dd>n</dd>
    </dl>
    zz
  </li>
</ul>
```

:::::

::::: compare

````carve
- a

  [^g]: %%%
    n
  zz
%%%

x[^g]
````

```html
<ul>
  <li><p>a</p>
    <p>zz</p>
  </li>
</ul>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::::
