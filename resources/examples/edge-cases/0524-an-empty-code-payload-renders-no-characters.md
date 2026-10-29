## An empty code payload renders no characters

PART 2 `code_content` is "any text until matching fence, preserved literally",
and zero lines preserved literally is zero characters. A newline is content, so
a fence with no payload lines that emits one publishes a character the author did
not write - and it makes the two documents below indistinguishable, which is the
same collapse `raw_block` states for itself in the category above.

The one-blank payload keeps its newline. That half is not in question and sits
here as the partner the zero-line shape is told apart from (carve#2560).

::: compare

````carve
```
```
````

```html
<pre><code></code></pre>
```

:::

::: compare

````carve
```

```
````

```html
<pre><code>
</code></pre>
```

:::
