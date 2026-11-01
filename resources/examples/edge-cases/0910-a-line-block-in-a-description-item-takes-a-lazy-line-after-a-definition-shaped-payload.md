## A line block in a description item takes a lazy line after a definition-shaped payload

A line block's payload is inline content whatever its shape, so a line block
in a list item, quote or nested description inside a description still takes
the lazy line below an attribute- or definition-shaped payload line
(carve#4748).

::: compare

````carve
:: t
: - ::: |
    {.k}
b
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <div class="line-block">
          <p>{.k}<br>
b</p>
        </div>
      </li>
    </ul>
  </dd>
</dl>
```

:::

::: compare

````carve
:: t
: > - ::: |
  >   {#i}
b
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <ul>
        <li>
          <div class="line-block">
            <p>{<span class="tag"><strong>#i</strong></span>}<br>
b</p>
          </div>
        </li>
      </ul>
    </blockquote>
  </dd>
</dl>
```

:::

::: compare

````carve
:: t
: - - ::: |
      [x]: /u
b
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <ul>
          <li>
            <div class="line-block">
              <p>[x]: /u<br>
b</p>
            </div>
          </li>
        </ul>
      </li>
    </ul>
  </dd>
</dl>
```

:::

::: compare

````carve
:: t
: :: u
  : ::: |
    [^1]: n
b
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <dl>
      <dt>u</dt>
      <dd>
        <div class="line-block">
          <p>[^1]: n<br>
b</p>
        </div>
      </dd>
    </dl>
  </dd>
</dl>
```

:::
