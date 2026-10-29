## An unclosed bare colon fence opens a div

A fence with no type word is still an opener, and an opener with no closer
ahead of it still opens: the container runs to the end of the input and closes
there, exactly as a labeled one does (PART 9 §12, PART 2). Section 12 used to
carve out the bare spelling and call it literal text, which no engine ever
implemented and which PART 2 had already superseded; the shape went unpinned
long enough for the two clauses to disagree in writing (carve#1717).

:::: compare

```carve
before
:::
after
```

```html
<p>before</p>
<div>
  <p>after</p>
</div>
```

::::
