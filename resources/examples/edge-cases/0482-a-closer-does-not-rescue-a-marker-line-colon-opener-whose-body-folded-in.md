## A closer does not rescue a marker-line colon opener whose body folded in

A `:::` on a list item's marker line opens its container whatever follows
(*Only lazy folding demotes a marker-line colon opener*, ruled on
markup-carve/carve#2978). A line below the item's content column is not its
body, and the empty container holds no paragraph, so the line leaves the list
and opens a document paragraph. A bare `:::` written after it closes nothing
that is open, so it is an opener: it interrupts that paragraph (§10 I1),
indented or not (PART 0 S3), and opens an empty div. The section keeps the
title of the reading it used to pin (markup-carve/carve#2147).

::::: compare

````carve
- :::
 y
  :::
````

```html
<ul>
  <li>
    <div>

    </div>
  </li>
</ul>
<p>y</p>
<div>

</div>
```

:::::

::::: compare

````carve
- ::: note
 y
  :::
````

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">

    </aside>
  </li>
</ul>
<p>y</p>
<div>

</div>
```

:::::

The same holds for an ordered item, for several lines and after a blank line.
In a nested item the line below the inner column still reaches the outer item,
which takes it as text, and the run opens its div in the outer item.

::::: compare

````carve
1. ::: d
 y
   :::
````

```html
<ol>
  <li>
    <div class="d">

    </div>
  </li>
</ol>
<p>y</p>
<div>

</div>
```

:::::

::::: compare

````carve
- ::: d
 y
 z
  :::
````

```html
<ul>
  <li>
    <div class="d">

    </div>
  </li>
</ul>
<p>y
z</p>
<div>

</div>
```

:::::

::::: compare

````carve
- ::: d
 y

  :::
````

```html
<ul>
  <li>
    <div class="d">

    </div>
  </li>
</ul>
<p>y</p>
<div>

</div>
```

:::::

::::: compare

````carve
- x
  - ::: d
   y
    :::
````

```html
<ul>
  <li>x
    <ul>
      <li>
        <div class="d">

        </div>
      </li>
    </ul>
    y
    <div>

    </div>
  </li>
</ul>
```

:::::

CONTROL. An opener that acquires body at the column still opens, with or without
lines folded in after it; one written later in the item, or on a quote's line, is
not a marker-line opener and keeps its container.

::::: compare

````carve
- ::: d
  :::
````

```html
<ul>
  <li>
    <div class="d">

    </div>
  </li>
</ul>
```

:::::

::::: compare

````carve
- ::: d
  x
 y
  :::
````

```html
<ul>
  <li>
    <div class="d">
      <p>x
y</p>
    </div>
  </li>
</ul>
```

:::::

::::: compare

````carve
- a
  ::: d
 y
  :::
````

```html
<ul>
  <li>a
    <div class="d">

    </div>
  </li>
</ul>
<p>y</p>
<div>

</div>
```

:::::

::::: compare

````carve
> ::: d
y
> :::
````

```html
<blockquote>
  <div class="d">

  </div>
</blockquote>
<p>y</p>
<blockquote>
  <div>

  </div>
</blockquote>
```

:::::
