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
        <blockquote>

        </blockquote>
      </li>
      <li>
        <blockquote>

        </blockquote>
      </li>
    </ul>
  </blockquote>
  <p>s</p>
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
        <blockquote>

        </blockquote>
      </li>
      <li>
        <blockquote>

        </blockquote>
      </li>
    </ul>
  </blockquote>
  <p>tail</p>
</blockquote>
```

::::
