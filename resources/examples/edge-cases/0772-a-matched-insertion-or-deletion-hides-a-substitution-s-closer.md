## A matched insertion or deletion hides a substitution's closer

A matched `{+ +}` or `{- -}` frame is an E2a boundary, so a `~}` or `~>` inside it belongs to the frame. The substitution around it looks for its own arrow and closer past the frame.

::: compare

```carve
{~a~>{+b~}+}~}
```

```html
<p><del>a</del><ins><ins>b~}</ins></ins></p>
```

:::

::: compare

```carve
{~a~>{-b~}-}~}
```

```html
<p><del>a</del><ins><del>b~}</del></ins></p>
```

:::

::: compare

```carve
{~{+b~>c+}~>a~}
```

```html
<p><del><ins>b~&gt;c</ins></del><ins>a</ins></p>
```

:::

::: compare

```carve
{~{-b~>c-}~}
```

```html
<p><s><del>b~&gt;c</del></s></p>
```

:::
