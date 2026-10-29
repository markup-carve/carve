## A resumed lazy run belongs to the innermost marker-line item

A marker line may open more than one list item. Once a flush lazy line folds
into the innermost item's paragraph, PART 1 S4 closes nothing: the next line is
still placed against that innermost open paragraph, whether it is flush, at the
outer item's content column, or at the inner item's content column. A line
comment ends that paragraph but keeps the same innermost item open for the next
paragraph.

:::: compare

```carve
* * u
%
 :
```

```html
<ul>
  <li>
    <ul>
      <li>u
%
:</li>
    </ul>
  </li>
</ul>
```

::::

:::: compare

```carve
* * u
%
  :
```

```html
<ul>
  <li>
    <ul>
      <li>u
%
:</li>
    </ul>
  </li>
</ul>
```

::::

:::: compare

```carve
* * u
%
    :
```

```html
<ul>
  <li>
    <ul>
      <li>u
%
:</li>
    </ul>
  </li>
</ul>
```

::::

:::: compare

```carve
* * u
%%
 :
```

```html
<ul>
  <li>
    <ul>
      <li>u</li>
    </ul>
  </li>
</ul>
<p>:</p>
```

::::

A collected definition instead leaves no paragraph open. The same columns then
select the surviving container: below the outer item closes both lists, the
outer content column belongs to the outer item, and the inner content column
belongs to the inner item. A comment cannot reopen a definition-only item.

:::: compare

```carve
* * [d]: u
 :
```

```html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>:</p>
```

::::

:::: compare

```carve
* * [d]: u
  :
```

```html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
    :
  </li>
</ul>
```

::::

:::: compare

```carve
* * [d]: u
    :
```

```html
<ul>
  <li>
    <ul>
      <li>:</li>
    </ul>
  </li>
</ul>
```

::::

:::: compare

```carve
* * [d]: u
%%
:
```

```html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>:</p>
```

::::
