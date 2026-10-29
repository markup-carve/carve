## An empty term marker in a description body is text

A `::` line with nothing after it but whitespace is not a term: a marker needs
content, trailing whitespace is dropped and is not content (CARVE-P2-025), and
`::` and `:: ` are one line. It opens no block, so below the body's column it
folds into the open paragraph like any other plain line (CARVE-P9-083). The
third line of the first document is `::` and one space, of the second `::` and
two (markup-carve/carve-js#1891).

::::: compare

````carve
:: t
: a
:: 
c
````

```html
<dl>
  <dt>t</dt>
  <dd>a
::
c</dd>
</dl>
```

:::::

::::: compare

````carve
:: t
: a
::  
c
````

```html
<dl>
  <dt>t</dt>
  <dd>a
::
c</dd>
</dl>
```

:::::

At the end of the document, after a continuation line, and before a description
marker, which opens a second description of the same term.

::::: compare

````carve
:: t
: a
:: 
````

```html
<dl>
  <dt>t</dt>
  <dd>a
::</dd>
</dl>
```

:::::

::::: compare

````carve
:: t
: a
  b
:: 
c
````

```html
<dl>
  <dt>t</dt>
  <dd>a
b
::
c</dd>
</dl>
```

:::::

::::: compare

````carve
:: t
: a
:: 
: c
````

```html
<dl>
  <dt>t</dt>
  <dd>a
::</dd>
  <dd>c</dd>
</dl>
```

:::::

CONTROL. The same line without the space, which every reader already folds.

::::: compare

````carve
:: t
: a
::
c
````

```html
<dl>
  <dt>t</dt>
  <dd>a
::
c</dd>
</dl>
```

:::::
