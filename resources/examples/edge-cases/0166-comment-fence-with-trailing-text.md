## Comment fence with trailing text

A `%%%` fence line is a delimiter plus an insignificant tail: only the leading run of `%` is structural, so `%%% html` opens a comment and `%%% end` closes one. No separating space is required, and `%%%` has no info string - a raw passthrough block is a *code* fence with an `=FORMAT` info string - so the body stays hidden and the following block still renders.

::: compare

```carve
before

%%% html
secret
%%% end

after
```

```html
<p>before</p>
<p>after</p>
```

:::
