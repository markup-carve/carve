---
page: edge-inline
---

## A reference link around a literal directive renders

A directive invalid on its face is emitted as its source text and a link around it may still pair across it (CARVE-P6-001). A reference link is no exception.

::::::: compare

````carve
[a {{ x @lines:0 }} b][r]

[r]: /r
````

````html
<p><a href="/r">a {{ x @lines:0 }} b</a></p>
````

:::::::

The rest of the link text reads as usual.

::::::: compare

````carve
[{{ x @code }} *b*][r] c

[r]: /r
````

````html
<p><a href="/r">{{ x @code }} <strong>b</strong></a> c</p>
````

:::::::
