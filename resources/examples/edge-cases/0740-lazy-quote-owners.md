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
```

::::
