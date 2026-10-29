## An at-column comment retains nothing

A comment at or past the content column closes the item’s paragraph and grants
no retention to the following below-column line (`CARVE-P0-009` X1,
`CARVE-P9-053`).

::: compare

````carve
> - ::: box
>   - ::: inner
>     %% c
>    text
tail
````

```html
<blockquote>
  <ul>
    <li>
      <div class="box">
        <ul>
          <li>
            <div class="inner">

            </div>
          </li>
        </ul>
        <p>text
tail</p>
      </div>
    </li>
  </ul>
</blockquote>
```

````carve
- inner
  %% c
 code
- tail
````

```html
<ul>
  <li>inner</li>
</ul>
<p>code
- tail</p>
```

:::
