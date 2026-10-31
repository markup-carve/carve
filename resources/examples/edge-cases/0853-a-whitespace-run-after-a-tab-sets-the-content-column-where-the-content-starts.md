---
page: edge-lists
---

## A whitespace run after a tab sets the content column where the content starts

CARVE-P2-010 and PART 9 §24 C3 (carve#4610). The content column of a tab-led item is the column after the separator space, so it does not read as its space twin: a line at column 2 or past it continues the item, and the tab stays in the item's text. The section title names the reading carve#4610 replaced and stays as the corpus name.

:::: compare

````carve
- 	 e

	f
````

```html
<ul>
  <li><p>	 e</p>
    <p>f</p>
  </li>
</ul>
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
  <li>	e
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
