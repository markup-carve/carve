---
page: edge-lists
---

## A single capital with a dot needs two spaces

A letter or roman marker followed by `.` opens an ordered item only when two or more spaces separate it from the content (carve#4811, superseding ruling; the section name is append-only). Initials and abbreviations at the start of a line stay paragraph text. Digits and `)` markers are unchanged.

The reproduction from carve#4811. With one space after each `.` none of the three letters is a marker:

:::: compare

```carve
J. R. R. Tolkien wrote it
```

```html
<p>J. R. R. Tolkien wrote it</p>
```

::::

A lone capital at the start of a paragraph is text:

:::: compare

```carve
A. Smith said so
```

```html
<p>A. Smith said so</p>
```

::::

After a blank line too:

:::: compare

```carve
para

P. S. see below
```

```html
<p>para</p>
<p>P. S. see below</p>
```

::::

Two spaces make the marker:

:::: compare

```carve
A.  first
B.  second
```

```html
<ol type="A">
  <li>first</li>
  <li>second</li>
</ol>
```

::::

Each item is judged on its own line, so a one-space sibling continues the item above:

:::: compare

```carve
A.  first
B. second
```

```html
<ol type="A">
  <li>first
B. second</li>
</ol>
```

::::

A roman numeral of any length needs the two spaces too:

:::: compare

```carve
I. one
II. two
```

```html
<p>I. one
II. two</p>
```

::::

The `)` delimiter is unchanged, and a lowercase letter needs the two spaces:

:::: compare

```carve
A) one
B) two
```

```html
<ol type="A" data-delim=")">
  <li>one</li>
  <li>two</li>
</ol>
```

::::

:::: compare

```carve
a. one
b. two
```

```html
<p>a. one
b. two</p>
```

::::

Attributes sit before the required spaces:

:::: compare

```carve
A.{.c}  x
```

```html
<ol type="A">
  <li class="c">x</li>
</ol>
```

::::

:::: compare

```carve
A.{.c} x
```

```html
<p>A.{.c} x</p>
```

::::

An abbreviation is text:

:::: compare

```carve
e. g. foo
```

```html
<p>e. g. foo</p>
```

::::

Two spaces after a lowercase letter make the marker:

:::: compare

```carve
a.  one
b.  two
```

```html
<ol type="a">
  <li>one</li>
  <li>two</li>
</ol>
```

::::

A digit keeps the single space:

:::: compare

```carve
1. one
2. two
```

```html
<ol>
  <li>one</li>
  <li>two</li>
</ol>
```

::::
