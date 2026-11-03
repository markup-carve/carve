---
page: edge-lists
---

## A comment span on a description or note marker line closes below its column

PART 9 §28 and PART 0 S1 (carve-php#4508). A `%%%` span opened after a `: ` description lead or a `[^n]: ` note lead belongs to that body, and an exact-width closer written below the body's column still closes it, at any nesting depth, as it does for a list item and at top level. A blank line inside the open span is payload, so a closer after it still closes the span. The line after the closer is read in the owner its column reaches.

::::: compare

````carve
- a
  :: u
  : %%%
%%%
c
````

```html
<ul>
  <li>a
    <dl>
      <dt>u</dt>
      <dd></dd>
    </dl>
  </li>
</ul>
<p>c</p>
```

:::::

::::: compare

````carve
- a

  [^n]: %%%
%%%
c
````

```html
<ul>
  <li>a</li>
</ul>
<p>c</p>
```

:::::

::::: compare

````carve
- a
  :: u
  : x
    %%%
%%%
:: c
````

```html
<ul>
  <li>a
    <dl>
      <dt>u</dt>
      <dd>x</dd>
    </dl>
  </li>
</ul>
<dl>
  <dt>c</dt>
</dl>
```

:::::

::::: compare

````carve
:: u
: %%%
    n

%%%
c
````

```html
<dl>
  <dt>u</dt>
  <dd></dd>
</dl>
<p>c</p>
```

:::::

::::: compare

````carve
x[^n]

[^n]: %%%
    n

%%%
c
````

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p>c</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::::

::::: compare

````carve
- a
  - %%%
    n

%%%
c
````

```html
<ul>
  <li>a
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>c</p>
```

:::::

::::: compare

````carve
- a
  :: u
  : %%%

%%%
  c
````

```html
<ul>
  <li>a
    <dl>
      <dt>u</dt>
      <dd></dd>
    </dl>
    c
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
    %%%
  zz

%%%
c
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
