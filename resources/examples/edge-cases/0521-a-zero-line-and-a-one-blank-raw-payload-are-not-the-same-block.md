## A zero-line and a one-blank raw payload are not the same block

PART 2 `raw_block` separates the two shapes by hand: zero payload lines
contribute nothing, one blank payload line contributes one newline, and an
implementation must not encode them identically. Joining n payload lines with a
newline gives n-1 newlines, which is the collapse the clause names, so each pair
below stands a zero-line payload beside a one-blank-line payload in one host and
changes nothing else between them.

A list item, a quote and an admonition come first. The fourth pair leaves the
fence unterminated, the second place the payload is built and the second place
it collapsed. The last document has no zero-line partner: at the top level the
blank payload line reads as a blank line between two paragraphs, and the
zero-line half there is carve-js#2326 rather than a question about the clause
(carve#2557).

::: compare

````carve
- a

  ```=html
  ```

- s
````

```html
<ul>
  <li><p>a</p>
    
  </li>
  <li><p>s</p></li>
</ul>
```

:::

::: compare

````carve
- a

  ```=html

  ```

- s
````

```html
<ul>
  <li><p>a</p>
    

  </li>
  <li><p>s</p></li>
</ul>
```

:::

::: compare

````carve
> a
>
> ```=html
> ```

b
````

```html
<blockquote>
  <p>a</p>
  
</blockquote>
<p>b</p>
```

:::

::: compare

````carve
> a
>
> ```=html
>
> ```

b
````

```html
<blockquote>
  <p>a</p>
  

</blockquote>
<p>b</p>
```

:::

:::: compare

````carve
::: note
a

```=html
```
:::
````

```html
<aside class="admonition note" aria-label="Note">
  <p>a</p>
  
</aside>
```

::::

:::: compare

````carve
::: note
a

```=html

```
:::
````

```html
<aside class="admonition note" aria-label="Note">
  <p>a</p>
  

</aside>
```

::::

::: compare

````carve
> a
>
> ```=html

b
````

```html
<blockquote>
  <p>a</p>
  
</blockquote>
<p>b</p>
```

:::

::: compare

````carve
> a
>
> ```=html
>

b
````

```html
<blockquote>
  <p>a</p>
  

</blockquote>
<p>b</p>
```

:::

::: compare

````carve
a

```=html

```

b
````

```html
<p>a</p>


<p>b</p>
```

:::
