---
page: edge-lists
---

## An invisible line between list or description siblings is skipped

PART 9 §10 CARVE-P9-013 (carve#4716). Every invisible line is skipped between two list items: a link definition leaves the list open, as a comment does, and still registers.

:::::: compare

`````carve
- a
[r]: /u
- b [x][r]
`````

```html
<ul>
  <li>a</li>
  <li>b <a href="/u">x</a></li>
</ul>
```

::::::

A document-level abbreviation definition between two items is skipped the same way.

:::::: compare

`````carve
- a
*[A]: x
- b A
`````

```html
<ul>
  <li>a</li>
  <li>b <abbr title="x">A</abbr></li>
</ul>
```

::::::

A comment between a term and its description leaves the description list open.

:::::: compare

`````carve
:: t
%% c
: d
`````

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
```

::::::

A link definition between two entries, inside a quote, leaves that description list open too.

:::::: compare

`````carve
> :: t
> : x
> [r]: /u
> :: u
> : v [y][r]
`````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>x</dd>
    <dt>u</dt>
    <dd>v <a href="/u">y</a></dd>
  </dl>
</blockquote>
```

::::::
