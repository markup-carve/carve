## Unterminated comment fence

Since markup-carve/carve#4907 a `%%%` opener opens its span with no closer
lookahead: without a closer it hides everything up to a line that misses its
owner or the end of its container (PART 9 §28). The rows below follow that
reading; where the prose describes a closerless opener as a `%%` line or a
closer ahead as deciding the span, it records the reading the ruling replaced.

A `%%%` opener with no matching closer ahead does not open a block. The line degrades to a `%%` line comment, so every following block still renders. This is deliberately **not** the unclosed-`:::` rule (PART 9 §12), where the opener opens and the container closes at the end of the input: a comment block is invisible either way, so failing closed costs nothing here, whereas the same choice on a container turned one mistyped closer into a tail of literal text. A tail on the opener (`%%% TODO`) changes nothing.

::: compare

```carve
before

%%%
secret

after
```

```html
<p>before</p>
```

:::
