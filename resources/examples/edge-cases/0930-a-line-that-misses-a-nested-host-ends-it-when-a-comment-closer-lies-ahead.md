---
page: edge-lists
---

## A line that misses a nested host ends it when a comment closer lies ahead

Since markup-carve/carve#4907 a `%%%` opener opens its span with no closer
lookahead: without a closer it hides everything up to a line that misses its
owner or the end of its container (PART 9 §28). The rows below follow that
reading; where the prose describes a closerless opener as a `%%` line or a
closer ahead as deciding the span, it records the reading the ruling replaced.

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
      <li></li>
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
      <li></li>
    </ol>
    zz
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
    <blockquote>

    </blockquote>
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
    <blockquote>

    </blockquote>
    zz
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
      <dd></dd>
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
```

:::::
