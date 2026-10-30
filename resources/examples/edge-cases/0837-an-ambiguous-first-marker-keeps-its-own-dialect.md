---
page: edge-lists
---

## An ambiguous first marker keeps its own dialect

A first marker that reads as a roman numeral and as a letter takes the PART 9 §11 N3 tie-break: roman when the next marker is the consecutive numeral, alpha when it is the consecutive letter, and otherwise roman for `i` and alpha for any other letter. A next marker outside that dialect starts a new list (carve#4351).

:::: compare

```carve
i. x
b. y
```

```html
<ol type="i">
  <li>x</li>
</ol>
<ol type="a" start="2">
  <li>y</li>
</ol>
```

::::

:::: compare

```carve
v. x
ii. y
```

```html
<ol type="a" start="22">
  <li>x</li>
</ol>
<ol type="i" start="2">
  <li>y</li>
</ol>
```

::::

:::: compare

```carve
I. x
A. y
B. z
```

```html
<ol type="I">
  <li>x</li>
</ol>
<ol type="A">
  <li>y</li>
  <li>z</li>
</ol>
```

::::
