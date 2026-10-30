## Lazy quote owners

:::: compare

```carve
>  {c
> }
a
```

```html
<blockquote>

</blockquote>
<p>a</p>
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
