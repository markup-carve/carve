---
page: edge-definitions
---

## A definition at column 0 stands in the document

An abbreviation definition at column 0 below an item ends the item and defines (carve#4412).

::::::: compare

````carve
- n
*[A]: b

A
````

````html
<ul>
  <li>n</li>
</ul>
<p><abbr title="b">A</abbr></p>
````

:::::::

A quote inside the item ends with it.

::::::: compare

````carve
- > n
*[A]: b

A
````

````html
<ul>
  <li>
    <blockquote><p>n</p></blockquote>
  </li>
</ul>
<p><abbr title="b">A</abbr></p>
````

:::::::

A description ends the same way.

::::::: compare

````carve
:: t
: n
*[A]: b

A
````

````html
<dl>
  <dt>t</dt>
  <dd>n</dd>
</dl>
<p><abbr title="b">A</abbr></p>
````

:::::::

A nested quote ends the same way.

::::::: compare

````carve
> > n
*[A]: b

A
````

````html
<blockquote>
  <blockquote><p>n</p></blockquote>
</blockquote>
<p><abbr title="b">A</abbr></p>
````

:::::::

A document-level quote keeps its output.

::::::: compare

````carve
> n
*[A]: b

A
````

````html
<blockquote><p>n</p></blockquote>
<p><abbr title="b">A</abbr></p>
````

:::::::

A reference definition below an item resolves.

::::::: compare

````carve
- n
[r]: /u

[x][r]
````

````html
<ul>
  <li>n</li>
</ul>
<p><a href="/u">x</a></p>
````

:::::::

A line that reaches the item stays its text.

::::::: compare

````carve
- n
  *[A]: b

A
````

````html
<ul>
  <li>n
*[A]: b</li>
</ul>
<p>A</p>
````

:::::::
