---
page: edge-inline
---

## A standalone code include with no resolver is literal in every host

PART 10 I1c and I2 (carve#4463): the line stays literal in a quote as at the top level, and a malformed language is literal inside a paragraph too.

:::: compare

````carve
x {{ a @code:a,b }} y
````

```html
<p>x {{ a @code:a,b }} y</p>
```

::::

:::: compare

````carve
> {{ a @code:a,b }}
````

```html
<blockquote><p>{{ a @code:a,b }}</p></blockquote>
```

::::

:::: compare

````carve
> {{ _a_ @code:js }}
````

```html
<blockquote><p>{{ _a_ @code:js }}</p></blockquote>
```

::::
