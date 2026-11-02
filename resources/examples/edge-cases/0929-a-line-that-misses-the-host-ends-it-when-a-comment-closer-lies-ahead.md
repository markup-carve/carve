---
page: edge-lists
---

## A line that misses the host ends it when a comment closer lies ahead

PART 0 S1 and the RECOVERY DECISION TABLE, PART 9 §28 (CARVE-P0-005, CARVE-P9-060, carve#4770). When a `%%%` opener's exact-width closer comes after a line that misses the host, that line still ends the host and is read in its own owner. The opener is then a `%%` line within the shortened host, so the lines between stay visible. With no closer ahead the same line folds into the paragraph, as it does after `%%`.

::::: compare

````carve
. a
  . %%%
    n
>>
%%%
````

```html
<ol>
  <li>a
    <ol>
      <li>n</li>
    </ol>
  </li>
</ol>
<p>&gt;&gt;</p>
```

:::::

::::: compare

````carve
. a
  . %%%
    n
>>
````

```html
<ol>
  <li>a
    <ol>
      <li>n
&gt;&gt;</li>
    </ol>
  </li>
</ol>
```

:::::

::::: compare

````carve
- a
  %%%
  n
zz
%%%
````

```html
<ul>
  <li>a
    n
  </li>
</ul>
<p>zz</p>
```

:::::

::::: compare

````carve
- a
  %%%
  n
zz
````

```html
<ul>
  <li>a
    n
zz
  </li>
</ul>
```

:::::
