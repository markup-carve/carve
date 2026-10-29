## Trojan-Source: rendered text and code strip bidi-override controls

A bidi-override / isolate control in rendered text or in a code span is dropped
(PART 9 §26): it is DOM-inert, and entity-encoding it would let it decode back
to the raw control downstream, so it is removed rather than escaped.

<!-- The carve body holds a, RIGHT-TO-LEFT OVERRIDE (U+202E), b. -->
In paragraph text the control is stripped:

::: compare no-render

```carve
a‮b
```

```html
<p>ab</p>
```

:::

<!-- The carve body holds a code span: a, RIGHT-TO-LEFT OVERRIDE (U+202E), b. -->
In a code span the control is stripped too (not entity-encoded):

::: compare no-render

```carve
`a‮b`
```

```html
<p><code>ab</code></p>
```

:::
