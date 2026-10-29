## An ordered item's separator width sets its content column

An ordered marker's content column is where its content actually starts - marker
width plus the authored separator run (PART 9 §24 C3). One space puts `1. x` at
column 3, two put `1.  x` at 4, three put `1.   x` at 5, and a continuation
belongs to the item only by reaching its own item's column. This is the rule the
bullet already follows and the one carve#1757 gave the definition body; the
ordered marker was the last construct measuring its separator against a fixed
width.

The one-space control: column 3, and a continuation at 3 reaches it.

::: compare

```carve
1. first

   second
```

```html
<ol>
  <li><p>first</p>
    <p>second</p>
  </li>
</ol>
```

:::

Two spaces move the column to 4, so the same column-3 continuation no longer
reaches it and the block after the blank is the document's own.

::: compare

```carve
1.  first

   second
```

```html
<ol>
  <li>first</li>
</ol>
<p>second</p>
```

:::

At column 4 it reaches.

::: compare

```carve
1.  first

    second
```

```html
<ol>
  <li><p>first</p>
    <p>second</p>
  </li>
</ol>
```

:::

Three spaces move it to 5. A wider run is not a third column and not a fixed
one: each spelling carries its own.

::: compare

```carve
1.   first

   second
```

```html
<ol>
  <li>first</li>
</ol>
<p>second</p>
```

:::

::: compare

```carve
1.   first

     second
```

```html
<ol>
  <li><p>first</p>
    <p>second</p>
  </li>
</ol>
```

:::

A marker-attached attribute block is metadata and contributes zero columns
(§15 A8), so it does not move the column the separator sets: `1.{.note}  ` is
still 4.

::: compare

```carve
1.{.note}  first

    second
```

```html
<ol>
  <li class="note"><p>first</p>
    <p>second</p>
  </li>
</ol>
```

:::

The bare decimal dot claims one marker column, so its separator run sets the
column from 1 rather than from 2: `.  x` is column 3.

::: compare

```carve
.  first

   second
```

```html
<ol>
  <li><p>first</p>
    <p>second</p>
  </li>
</ol>
```

:::

The marker's own width is the other half of the sum, and it is a RUN: `11.`
claims two value columns, `111.` three, and a roman `iii.` three. A two-space
separator therefore puts `11.  x` at column 5 and `111.  x` at 6, and a
continuation one column short of each reaches neither.

::: compare

```carve
11.  first

     second
```

```html
<ol start="11">
  <li><p>first</p>
    <p>second</p>
  </li>
</ol>
```

:::

::: compare

```carve
11.  first

    second
```

```html
<ol start="11">
  <li>first</li>
</ol>
<p>second</p>
```

:::

::: compare

```carve
111.  first

      second
```

```html
<ol start="111">
  <li><p>first</p>
    <p>second</p>
  </li>
</ol>
```

:::

::: compare

```carve
111.  first

     second
```

```html
<ol start="111">
  <li>first</li>
</ol>
<p>second</p>
```

:::

A roman numeral is a run too, so the same arithmetic reaches a dialect whose
value is not a digit at all.

::: compare

```carve
iii.  first

      second
```

```html
<ol type="i" start="3">
  <li><p>first</p>
    <p>second</p>
  </li>
</ol>
```

:::

::: compare

```carve
iii.  first

     second
```

```html
<ol type="i" start="3">
  <li>first</li>
</ol>
<p>second</p>
```

:::
