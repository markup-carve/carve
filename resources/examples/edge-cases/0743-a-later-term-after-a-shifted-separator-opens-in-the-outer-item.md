## A later term after a shifted separator opens in the outer item

:::: compare

```carve
- * :: t
  : a
    :: sibling
    tail
```

```html
<ul>
  <li>
    <ul>
      <li>
        <dl>
          <dt>t</dt>
        </dl>
      </li>
    </ul>
    : a
    <dl>
      <dt>sibling
tail</dt>
    </dl>
  </li>
</ul>
```

::::

:::: compare

```carve
> - * :: t
>   : a
>      :: sibling
>      tail
```

```html
<blockquote>
  <ul>
    <li>
      <ul>
        <li>
          <dl>
            <dt>t</dt>
          </dl>
        </li>
      </ul>
      : a
      <dl>
        <dt>sibling
tail</dt>
      </dl>
    </li>
  </ul>
</blockquote>
```

::::

:::: compare

```carve
::: box
- * :: t
  : a
    :: sibling
    tail
:::
```

```html
<div class="box">
  <ul>
    <li>
      <ul>
        <li>
          <dl>
            <dt>t</dt>
          </dl>
        </li>
      </ul>
      : a
      <dl>
        <dt>sibling
tail</dt>
      </dl>
    </li>
  </ul>
</div>
```

::::
