## Smart typography escapes and code

A backslash keeps the literal sequence; code spans and blocks are
never transformed.

::: compare

```carve
Escaped \-> and \... stay; code `a -- b ...` stays.
```

```html
<p>Escaped -&gt; and ... stay; code <code>a -- b ...</code> stays.</p>
```

:::
