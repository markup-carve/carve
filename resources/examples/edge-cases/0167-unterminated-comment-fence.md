## Unterminated comment fence

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
<p>secret</p>
<p>after</p>
```

:::
