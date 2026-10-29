## A bare colon run interrupts a paragraph whether or not a line follows it

A `:::` opener is not guarded (§10 I4), so a bare run after a paragraph opens a
div even as the last line of its container. This is CARVE-P9-016's own left-hand
example, and it holds in a list item and a block quote as at the top level
(markup-carve/carve#2151).

::::: compare

````carve
text
not a div
:::
````

```html
<p>text
not a div</p>
<div>

</div>
```

:::::

::::: compare

````carve
- a
  :::
````

```html
<ul>
  <li>a
    <div>

    </div>
  </li>
</ul>
```

:::::

::::: compare

````carve
> a
> :::
````

```html
<blockquote>
  <p>a</p>
  <div>

  </div>
</blockquote>
```

:::::

The empty div leaves no paragraph open, so a flush-left line after it closes the
item, and a caption ends at the run as it ends at any interrupting block.

::::: compare

````carve
- a
  :::
y
````

```html
<ul>
  <li>a
    <div>

    </div>
  </li>
</ul>
<p>y</p>
```

:::::

::::: compare

````carve
![a](i)
^ cap
:::
````

```html
<figure>
  <img src="i" alt="a">
  <figcaption>cap</figcaption>
</figure>
<div>

</div>
```

:::::

A run that closes nothing is an opener even where it was plainly meant as a
closer: exact width is a parse rule, and a mismatch opens a nested container
rather than turning into text (PART 9 §12).

::::: compare

````carve
:::: d
text
:::
````

```html
<div class="d">
  <p>text</p>
  <div>

  </div>
</div>
```

:::::

CONTROL. After an invalid opener the paragraph absorbs the run instead, which is
CARVE-P9-016's right-hand example and is unchanged.

::::: compare

````carve
::: {.x}
not a div
:::
````

```html
<p>::: {.x}
not a div
:::</p>
```

:::::
