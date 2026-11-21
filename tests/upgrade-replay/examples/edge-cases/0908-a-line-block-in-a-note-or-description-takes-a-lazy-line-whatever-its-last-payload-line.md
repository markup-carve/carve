## A line block in a note or description takes a lazy line whatever its last payload line

A payload line is inline content whatever host holds the line block, so a
note or description body whose stanza ends in a fence-, heading- or
attribute-shaped line still takes the lazy line below it (carve#4748).

::: compare

````carve
:: t
: > :::: |
  > ~~~
b
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <div class="line-block">
        <p>~~~<br>
b</p>
      </div>
    </blockquote>
  </dd>
</dl>
```

:::

::: compare

````carve
r[^1]

[^1]: ::: |
  # h
b
````

```html
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <div class="line-block">
        <p># h<br>
b</p>
      </div>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

````carve
:: t
: ::: |
  ~~~
b
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <div class="line-block">
      <p>~~~<br>
b</p>
    </div>
  </dd>
</dl>
```

:::

::: compare

````carve
:: t
: - ::: |
    # h
b
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <div class="line-block">
          <p># h<br>
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
: > ::: |
  > {.k}
b
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <div class="line-block">
        <p>{.k}<br>
b</p>
      </div>
    </blockquote>
  </dd>
</dl>
```

:::
