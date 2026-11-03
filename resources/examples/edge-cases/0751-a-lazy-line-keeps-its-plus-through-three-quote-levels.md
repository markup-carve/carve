## A lazy line keeps its plus through three quote levels

:::: compare

```carve
> > > - > +
> > > - > +
>  s
```

```html
<blockquote>
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
  </blockquote>
  <p>s</p>
</blockquote>
```

::::
