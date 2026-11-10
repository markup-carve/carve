---
page: edge-lists
---

## A comment between a term and its description is the description's first block

PART 0 FAMILY GUARDS and CARVE-P12-027 decide this case (carve#5167). A `%%%` span or `%%` line written after a term is the first block of the description that follows, after any further terms. The term still ends with its line (`[B-term-end]`), the list stays one list, and the comment renders nothing. The `.fmt` beside each row writes the comment on the description's marker line, at its body column.

A span at the term's content column, its payload indented past it:

:::::: compare

`````carve
:: t
  %%%
      a
  %%%
:  body
`````

```html
<dl>
  <dt>t</dt>
  <dd>body</dd>
</dl>
```

::::::

The same span at column 0:

:::::: compare

`````carve
:: t
%%%
a
%%%
: body
`````

```html
<dl>
  <dt>t</dt>
  <dd>body</dd>
</dl>
```

::::::

With a second term between, the span belongs to the description after `:: u`:

:::::: compare

`````carve
:: t
%%%
a
%%%
:: u
: body
`````

```html
<dl>
  <dt>t</dt>
  <dt>u</dt>
  <dd>body</dd>
</dl>
```

::::::

A `%%` line is placed the same way:

:::::: compare

`````carve
:: t
%% c
: body
`````

```html
<dl>
  <dt>t</dt>
  <dd>body</dd>
</dl>
```

::::::

And with a second term between:

:::::: compare

`````carve
:: t
%% c
:: u
: body
`````

```html
<dl>
  <dt>t</dt>
  <dt>u</dt>
  <dd>body</dd>
</dl>
```

::::::
