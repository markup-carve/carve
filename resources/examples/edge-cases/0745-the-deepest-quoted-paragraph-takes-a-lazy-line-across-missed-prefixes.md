## The deepest quoted paragraph takes a lazy line across missed prefixes

:::: compare

```carve
> > - > +
> > - > +
>  s
```

```html
<blockquote>
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
</blockquote>
```

::::

:::: compare

```carve
> > a
> b
```

```html
<blockquote>
  <blockquote><p>a
b</p></blockquote>
</blockquote>
```

::::

:::: compare

```carve
> > * > +
> > * > +
>  tail
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li>
        <blockquote><p>+</p></blockquote>
      </li>
      <li>
        <blockquote><p>+
tail</p></blockquote>
      </li>
    </ul>
  </blockquote>
</blockquote>
```

::::
