---
page: edge-inline
---

## A marker the left boundary refuses is an ordinary character

A `#` or `@` glued to a word opens no tag or mention, so no name run exists and what follows is read fresh (carve#4329).

:::: compare

````carve
b#->
````

```html
<p>b#→</p>
```

::::

:::: compare

````carve
b@->
````

```html
<p>b@→</p>
```

::::

:::: compare

````carve
b#-->
````

```html
<p>b#→</p>
```

::::

