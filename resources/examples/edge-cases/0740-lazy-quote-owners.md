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
