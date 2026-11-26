## CSV and TSV table bodies

`{table}` turns a `csv` or `tsv` fence into a table. Without the flag, the fence remains a code sample. Fields are plain text, including Carve punctuation.

::: compare

````carve
{table aligns=left,right,right}
```csv
Item,Qty,Price
Apple,12,0.40
"Pear, green",3,0.55
```
^ Stock on hand
````

```html
<table>
  <caption>Stock on hand</caption>
  <thead>
    <tr><th scope="col" style="text-align: left;">Item</th><th scope="col" style="text-align: right;">Qty</th><th scope="col" style="text-align: right;">Price</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: left;">Apple</td><td style="text-align: right;">12</td><td style="text-align: right;">0.40</td></tr>
    <tr><td style="text-align: left;">Pear, green</td><td style="text-align: right;">3</td><td style="text-align: right;">0.55</td></tr>
  </tbody>
</table>
```

:::

`header-rows=0` keeps every row in the body. The literal `^` and `<x>` fields are ordinary text cells.

::: compare

````carve
{table header-rows=0}
```tsv
A	B
^	<x>
```
````

```html
<table>
  <tbody>
    <tr><td>A</td><td>B</td></tr>
    <tr><td>^</td><td>&lt;x&gt;</td></tr>
  </tbody>
</table>
```

:::

::: compare

````carve
```csv
a,b
```
````

```html
<pre><code class="language-csv">a,b
</code></pre>
```

:::

A quoted CSV field can contain a newline; the newline stays inside one cell.

::: compare

````carve
{table}
```csv
Name,Note
A,"one
two"
```
````

```html
<table>
  <thead>
    <tr><th scope="col">Name</th><th scope="col">Note</th></tr>
  </thead>
  <tbody>
    <tr><td>A</td><td>one
two</td></tr>
  </tbody>
</table>
```

:::

A footer does not displace the default header.

::: compare

````carve
{table footer-rows=1}
```csv
Item,Qty
Apple,2
Total,2
```
````

```html
<table>
  <thead>
    <tr><th scope="col">Item</th><th scope="col">Qty</th></tr>
  </thead>
  <tbody>
    <tr><td>Apple</td><td>2</td></tr>
  </tbody>
  <tfoot>
    <tr><td>Total</td><td>2</td></tr>
  </tfoot>
</table>
```

:::

An empty delimited fence makes an empty table.

::: compare

````carve
{table}
```csv
```
````

```html
<table>
</table>
```

:::

Malformed quoted input remains code, with the authored `table` attribute still present.

::: compare

````carve
{table}
```csv
"bad
```
````

```html
<pre table=""><code class="language-csv">"bad
</code></pre>
```

:::

Rows wider than the header stay intact; short rows gain empty cells.

::: compare

````carve
{table}
```csv
a,b
1
2,3,4
```
````

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th><th scope="col"></th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td></td><td></td></tr>
    <tr><td>2</td><td>3</td><td>4</td></tr>
  </tbody>
</table>
```

:::

A blank final record remains a row before the final separator.

::: compare

````carve
{table}
```csv
a

```
````

```html
<table>
  <thead>
    <tr><th scope="col">a</th></tr>
  </thead>
  <tbody>
    <tr><td></td></tr>
  </tbody>
</table>
```

:::

A footer can consume the only row.

::: compare

````carve
{table footer-rows=1}
```csv
last
```
````

```html
<table>
  <tfoot>
    <tr><td>last</td></tr>
  </tfoot>
</table>
```

:::

A quote inside an unquoted field leaves the fence as code.

::: compare

````carve
{table}
```csv
a"b,c
```
````

```html
<pre table=""><code class="language-csv">a"b,c
</code></pre>
```

:::

Text after a closing quote also leaves the fence as code.

::: compare

````carve
{table}
```csv
"a" ,b
```
````

```html
<pre table=""><code class="language-csv">"a" ,b
</code></pre>
```

:::
