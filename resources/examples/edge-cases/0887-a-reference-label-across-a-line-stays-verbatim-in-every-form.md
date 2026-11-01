---
page: edge-definitions
---

## A reference label across a line stays verbatim in every form

CARVE-P3-004 and the carve#4680 ruling: a reference label that crosses a line and fails stays verbatim, in collapsed and explicit form alike, and its interior is not rescanned (carve#4732). So no emphasis forms inside it, an abbreviation does not expand in it (carve#3822), a collapsed image reference renders its source, and a label that crosses a line claims its run the way a one-line label does, so a destination after it stays text.

::: compare

````carve
![x
y][]
````

````html
<p>![x
y][]</p>
````

:::

::: compare

````carve
[*t*][a
b]
````

````html
<p>[*t*][a
b]</p>
````

:::

::: compare

````carve
![*x*][a
b]
````

````html
<p>![*x*][a
b]</p>
````

:::

::: compare

````carve
*[y]: z

[*x*
y][]
````

````html
<p>[*x*
y][]</p>
````

:::

::: compare

````carve
*[y]: z

[x][y
q]
````

````html
<p>[x][y
q]</p>
````

:::

::: compare

````carve
[x][a
b](u)
````

````html
<p>[x][a
b](u)</p>
````

:::
