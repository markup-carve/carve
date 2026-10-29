## A refused plus without the inner quote prefix renders as text

A `+` without the inner quote prefix stays with its owning paragraph. A quoted descendant inside an ordered item does not erase the item’s sibling marker column (markup-carve/carve#3421).

::::::: compare

`````carve
> > - a
>   +
>   - b
`````

```html
<blockquote>
  <blockquote>
    <ul>
      <li>a
+
- b</li>
    </ul>
  </blockquote>
</blockquote>
```

:::::::

::::::: compare

`````carve
> > - a
>   Q
>   - b
`````

```html
<blockquote>
  <blockquote>
    <ul>
      <li>a
Q
- b</li>
    </ul>
  </blockquote>
</blockquote>
```

:::::::

::::::: compare

`````carve
1. ordered
  > > quote
+  
- item
`````

```html
<ol>
  <li>ordered</li>
</ol>
<blockquote>
  <blockquote><p>quote
+
- item</p></blockquote>
</blockquote>
```

:::::::

::::::: compare

`````carve
1. ordered
  > > quote
Q  
- item
`````

```html
<ol>
  <li>ordered</li>
</ol>
<blockquote>
  <blockquote><p>quote
Q
- item</p></blockquote>
</blockquote>
```

:::::::
