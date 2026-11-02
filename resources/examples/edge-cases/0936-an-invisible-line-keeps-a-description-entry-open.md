---
page: edge-lists
---

## An invisible line keeps a description entry open

PART 9 §10 I5 (CARVE-P9-013 property 3, carve#4862). A `%%` line, a matched `%%%` span, a link reference definition and an abbreviation definition after a term or a description close neither. The next visible line is read as if they were absent, so a `: ` line below stays a description and its body keeps its continuation lines.

::::: compare

````carve
:: t
:  d
*[A]: x
:  > a
   > b
````

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
  <dd>
    <blockquote><p>a
b</p></blockquote>
  </dd>
</dl>
```

:::::

::::: compare

````carve
- :: term
  : payload
%% c
   : d2
````

```html
<ul>
  <li>
    <dl>
      <dt>term</dt>
      <dd>payload</dd>
      <dd>d2</dd>
    </dl>
  </li>
</ul>
```

:::::

::::: compare

````carve
:: term
: payload
[r]: /u
 : d2
````

```html
<dl>
  <dt>term</dt>
  <dd>payload</dd>
  <dd>d2</dd>
</dl>
```

:::::

::::: compare

````carve
:: t
: d
%%%
c
%%%
 : d2
````

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
  <dd>d2</dd>
</dl>
```

:::::

::::: compare

````carve
- :: t
  :: t2
  %%%
  c
  %%%
  :  > a
     > b
````

```html
<ul>
  <li>
    <dl>
      <dt>t</dt>
      <dt>t2</dt>
      <dd>
        <blockquote><p>a
b</p></blockquote>
      </dd>
    </dl>
  </li>
</ul>
```

:::::

