---
page: edge-lists
---

## A marked blank inside a quoted verse span leaves the stanza open

PART 9 §23 (CARVE-P9-047, carve#4956) and PART 0 S1. A marked blank line inside a `%%%` span is span payload, so it does not end the line block's stanza: after the span the next line reads the stanza as it stood before it and folds as verse. This holds for a line block in a quoted description, in a quote nested in a quote and in a quoted item alike.

::::: compare

````carve
> :: t
> : ::: |
>   x
>   %%%
>
>   %%%
b
````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>
      <div class="line-block">
        <p>x<br>
b</p>
      </div>
    </dd>
  </dl>
</blockquote>
```

:::::

::::: compare

````carve
> > :: t
> > : ::: |
> >   x
> >   %%%
> >
> >   %%%
b
````

```html
<blockquote>
  <blockquote>
    <dl>
      <dt>t</dt>
      <dd>
        <div class="line-block">
          <p>x<br>
b</p>
        </div>
      </dd>
    </dl>
  </blockquote>
</blockquote>
```

:::::

::::: compare

````carve
> - ::: |
>   x
>   %%%
>
>   %%%
b
````

```html
<blockquote>
  <ul>
    <li>
      <div class="line-block">
        <p>x<br>
b</p>
      </div>
    </li>
  </ul>
</blockquote>
```

:::::
