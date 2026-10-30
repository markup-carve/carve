---
page: edge-lists
---

## A whitespace run after a tab sets the content column where the content starts

CARVE-P2-010 and PART 9 §24 C3 and C5 (carve#4122). A tab-led item reads as its space twin.

:::: compare

````carve
- 	 e

	f
````

```html
<ul>
  <li>e</li>
</ul>
<p>f</p>
```

::::

:::: compare

````carve
-    e

    f
````

```html
<ul>
  <li>e</li>
</ul>
<p>f</p>
```

::::

:::: compare

````carve
- 	e
	> q
````

```html
<ul>
  <li>e
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

::::

:::: compare

````carve
-   e
    > q
````

```html
<ul>
  <li>e
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

::::
