## Comment columns and surviving list items

A comment closes no list item at any column (carve#4862), so a follower at the
content column stays in the item after any run of line comments and spans,
wherever they stand. A sibling marker still starts the next item.

::: compare

```carve
- intro
%% c
tail
```

```html
<ul>
  <li>intro
tail</li>
</ul>
```

:::

::: compare

```carve
- intro
  %% c
tail
```

```html
<ul>
  <li>intro
tail</li>
</ul>
```

:::

::: compare

```carve
- intro
%%%
c
%%%
  tail
```

```html
<ul>
  <li>intro
    tail
  </li>
</ul>
```

:::

::: compare

```carve
- intro
%% c
- next
```

```html
<ul>
  <li>intro</li>
  <li>next</li>
</ul>
```

:::

::: compare

```carve
- intro
%% a
  %% b
tail
```

```html
<ul>
  <li>intro
tail</li>
</ul>
```

:::

::: compare

```carve
- intro
  %% a
%% b
tail
```

```html
<ul>
  <li>intro
tail</li>
</ul>
```

:::

::: compare

```carve
- intro
  %% a
%% b
  tail
```

```html
<ul>
  <li>intro
tail</li>
</ul>
```

:::

::: compare

```carve
- intro
  %% a
%%%
b
%%%
  tail
```

```html
<ul>
  <li>intro
    tail
  </li>
</ul>
```

:::
