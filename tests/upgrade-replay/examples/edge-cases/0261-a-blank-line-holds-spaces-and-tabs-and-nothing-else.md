## A blank line holds spaces and tabs and nothing else

`blank_line = {whitespace}, newline` (`resources/grammar.ebnf`, PART 1) over
`whitespace = ' ' | '\t'` (PART 7). Two characters, and
no third. Every other character that a host language's whitespace class might
sweep up - a Unicode space separator, a C0 control, a zero-width character - is
CONTENT, so a line holding one of them keeps the paragraph open and soft-breaks
into it.

PART 0 states the U+FEFF row of that outright, under A LEADING BYTE ORDER MARK
IS STRIPPED:
a leading byte order mark is stripped, "ONE, and only there: a U+FEFF anywhere
else is an ordinary zero-width character". The three documents below carry the
characters raw; they are invisible in review, which is why
`tests/fixture-bytes.test.mjs` pins each one by name.

The rule and its opposite, in one document: the line holding only a byte order
mark is content and `a` continues into `b`, while a line holding only spaces and
a line holding only a tab each end the paragraph. Covers U+FEFF, U+0020 and
U+0009.

::: compare

```carve
a
﻿
b
  
c
	
d
```

```html
<p>a
﻿
b</p>
<p>c</p>
<p>d</p>
```

:::

The Unicode space separators are not `whitespace` either, nor is the other
zero-width character PART 9 names alongside the byte order mark. One paragraph,
nine soft breaks. Covers U+00A0, U+1680, U+2000, U+2009, U+200A, U+202F, U+205F,
U+3000 and U+200B.

::: compare

```carve
a
 
 
 
 
 
 
 
　
​
b
```

```html
<p>a
&nbsp;
 
 
 
 
 
 
　
​
b</p>
```

:::

The C0 controls and the Unicode line and paragraph separators are the rows a
regular-expression whitespace class reaches without anyone deciding it should.
They are content too. Covers U+000B, U+000C, U+0085, U+2028 and U+2029.

::: compare

```carve
a



 
 
b
```

```html
<p>a



 
 
b</p>
```

:::
