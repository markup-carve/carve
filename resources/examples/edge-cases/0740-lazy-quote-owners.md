## Lazy quote owners

:::: compare

```carve
>  {c
> }
a
```

```html
<blockquote><p>{c
}
a</p></blockquote>
```

::::

:::: compare

```carve
> - > +
> - > +
 s
```

```html
<blockquote>
  <ul>
    <li>
      <blockquote><p>+</p></blockquote>
    </li>
    <li>
      <blockquote><p>+
s</p></blockquote>
    </li>
  </ul>
</blockquote>
```

::::
