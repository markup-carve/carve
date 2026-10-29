## A line block takes a lazy line whatever its last payload line

An unclosed line block keeps a following lazy line in its quote even when its
payload looks like a fence or heading (carve-php#3237). The payload is inline
content.

::: compare

````carve
> ::: |
> ```
> x
after
````

```html
<blockquote>
  <div class="line-block">
    <p><code>
x
after</code></p>
  </div>
</blockquote>
```

:::

::: compare

````carve
> ::: |
> # h
> x
after
````

```html
<blockquote>
  <div class="line-block">
    <p># h<br>
x<br>
after</p>
  </div>
</blockquote>
```

:::
