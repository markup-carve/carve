## An opener is open where it stands, so a combined token after a guarded star stays split

An opener counts as open from where it stands, with no lookahead to whether it later closes (PART 9 SS9 E3). In `_*` followed by `/*`, the `*` of `_*` is open when `/*` arrives, so the combined token does not open and its `/` and `*` are read singly, whether or not that `_` closes later.

::: compare

```carve
_*`/`/*{c_}*/
```

```html
<p>_<strong c_=""><code>/</code>/</strong>*/</p>
```

:::

::: compare

```carve
_*`/`/*{t=a*/}*/
```

```html
<p>_<strong t="a*/"><code>/</code>/</strong>*/</p>
```

:::

::: compare

```carve
_*/*a**/
```

```html
<p>_<strong>/*a</strong>*/</p>
```

:::

::: compare

```carve
_*`/`/*a**/
```

```html
<p>_<strong><code>/</code>/*a</strong>*/</p>
```

:::

::: compare

```carve
_*`/`/*{c_}*/_
```

```html
<p><u><strong c_=""><code>/</code>/</strong>*/</u></p>
```

:::

::: compare

```carve
_*`/`/*{c_}_
```

```html
<p><u><strong c_=""><code>/</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`/`/*{c_}
```

```html
<p>_<strong c_=""><code>/</code>/</strong></p>
```

:::

::: compare

```carve
_*`/`/*{t=a*/}*/_
```

```html
<p><u><strong t="a*/"><code>/</code>/</strong>*/</u></p>
```

:::

::: compare

```carve
_*`/`/*{t=a*/}_
```

```html
<p><u><strong t="a*/"><code>/</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`/`/*{t=a*/}
```

```html
<p>_<strong t="a*/"><code>/</code>/</strong></p>
```

:::

::: compare

```carve
_*`/`/*a*/
```

```html
<p>_<strong><code>/</code>/*a</strong>/</p>
```

:::

::: compare

```carve
_*`/`/*a*/_
```

```html
<p><u><strong><code>/</code>/*a</strong>/</u></p>
```

:::

::: compare

```carve
_*`/`/*a_
```

```html
<p><u>*<code>/</code>/*a</u></p>
```

:::

::: compare

```carve
_*`/`/*a
```

```html
<p>_*<code>/</code>/*a</p>
```

:::

::: compare

```carve
_*`/`/*{c}_*/
```

```html
<p><u><strong c=""><code>/</code>/</strong></u>*/</p>
```

:::

::: compare

```carve
_*`/`/*{c}_*/_
```

```html
<p><u><strong c=""><code>/</code>/</strong></u>*/_</p>
```

:::

::: compare

```carve
_*`/`/*{c}__
```

```html
<p><u><strong c=""><code>/</code>/</strong></u>_</p>
```

:::

::: compare

```carve
_*`/`/*{c}_
```

```html
<p><u><strong c=""><code>/</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`a/`/*{c_}*/
```

```html
<p>_<strong c_=""><code>a/</code>/</strong>*/</p>
```

:::

::: compare

```carve
_*`a/`/*{c_}*/_
```

```html
<p><u><strong c_=""><code>a/</code>/</strong>*/</u></p>
```

:::

::: compare

```carve
_*`a/`/*{c_}_
```

```html
<p><u><strong c_=""><code>a/</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`a/`/*{c_}
```

```html
<p>_<strong c_=""><code>a/</code>/</strong></p>
```

:::

::: compare

```carve
_*`a/`/*{t=a*/}*/
```

```html
<p>_<strong t="a*/"><code>a/</code>/</strong>*/</p>
```

:::

::: compare

```carve
_*`a/`/*{t=a*/}*/_
```

```html
<p><u><strong t="a*/"><code>a/</code>/</strong>*/</u></p>
```

:::

::: compare

```carve
_*`a/`/*{t=a*/}_
```

```html
<p><u><strong t="a*/"><code>a/</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`a/`/*{t=a*/}
```

```html
<p>_<strong t="a*/"><code>a/</code>/</strong></p>
```

:::

::: compare

```carve
_*`a/`/*a*/
```

```html
<p>_<strong><code>a/</code>/*a</strong>/</p>
```

:::

::: compare

```carve
_*`a/`/*a*/_
```

```html
<p><u><strong><code>a/</code>/*a</strong>/</u></p>
```

:::

::: compare

```carve
_*`a/`/*a_
```

```html
<p><u>*<code>a/</code>/*a</u></p>
```

:::

::: compare

```carve
_*`a/`/*a
```

```html
<p>_*<code>a/</code>/*a</p>
```

:::

::: compare

```carve
_*`a/`/*{c}_*/
```

```html
<p><u><strong c=""><code>a/</code>/</strong></u>*/</p>
```

:::

::: compare

```carve
_*`a/`/*{c}_*/_
```

```html
<p><u><strong c=""><code>a/</code>/</strong></u>*/_</p>
```

:::

::: compare

```carve
_*`a/`/*{c}__
```

```html
<p><u><strong c=""><code>a/</code>/</strong></u>_</p>
```

:::

::: compare

```carve
_*`a/`/*{c}_
```

```html
<p><u><strong c=""><code>a/</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`//`/*{c_}*/
```

```html
<p>_<strong c_=""><code>//</code>/</strong>*/</p>
```

:::

::: compare

```carve
_*`//`/*{c_}*/_
```

```html
<p><u><strong c_=""><code>//</code>/</strong>*/</u></p>
```

:::

::: compare

```carve
_*`//`/*{c_}_
```

```html
<p><u><strong c_=""><code>//</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`//`/*{c_}
```

```html
<p>_<strong c_=""><code>//</code>/</strong></p>
```

:::

::: compare

```carve
_*`//`/*{t=a*/}*/
```

```html
<p>_<strong t="a*/"><code>//</code>/</strong>*/</p>
```

:::

::: compare

```carve
_*`//`/*{t=a*/}*/_
```

```html
<p><u><strong t="a*/"><code>//</code>/</strong>*/</u></p>
```

:::

::: compare

```carve
_*`//`/*{t=a*/}_
```

```html
<p><u><strong t="a*/"><code>//</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`//`/*{t=a*/}
```

```html
<p>_<strong t="a*/"><code>//</code>/</strong></p>
```

:::

::: compare

```carve
_*`//`/*a*/
```

```html
<p>_<strong><code>//</code>/*a</strong>/</p>
```

:::

::: compare

```carve
_*`//`/*a*/_
```

```html
<p><u><strong><code>//</code>/*a</strong>/</u></p>
```

:::

::: compare

```carve
_*`//`/*a_
```

```html
<p><u>*<code>//</code>/*a</u></p>
```

:::

::: compare

```carve
_*`//`/*a
```

```html
<p>_*<code>//</code>/*a</p>
```

:::

::: compare

```carve
_*`//`/*{c}_*/
```

```html
<p><u><strong c=""><code>//</code>/</strong></u>*/</p>
```

:::

::: compare

```carve
_*`//`/*{c}_*/_
```

```html
<p><u><strong c=""><code>//</code>/</strong></u>*/_</p>
```

:::

::: compare

```carve
_*`//`/*{c}__
```

```html
<p><u><strong c=""><code>//</code>/</strong></u>_</p>
```

:::

::: compare

```carve
_*`//`/*{c}_
```

```html
<p><u><strong c=""><code>//</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`x /`/*{c_}*/
```

```html
<p>_<strong c_=""><code>x /</code>/</strong>*/</p>
```

:::

::: compare

```carve
_*`x /`/*{c_}*/_
```

```html
<p><u><strong c_=""><code>x /</code>/</strong>*/</u></p>
```

:::

::: compare

```carve
_*`x /`/*{c_}_
```

```html
<p><u><strong c_=""><code>x /</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`x /`/*{c_}
```

```html
<p>_<strong c_=""><code>x /</code>/</strong></p>
```

:::

::: compare

```carve
_*`x /`/*{t=a*/}*/
```

```html
<p>_<strong t="a*/"><code>x /</code>/</strong>*/</p>
```

:::

::: compare

```carve
_*`x /`/*{t=a*/}*/_
```

```html
<p><u><strong t="a*/"><code>x /</code>/</strong>*/</u></p>
```

:::

::: compare

```carve
_*`x /`/*{t=a*/}_
```

```html
<p><u><strong t="a*/"><code>x /</code>/</strong></u></p>
```

:::

::: compare

```carve
_*`x /`/*{t=a*/}
```

```html
<p>_<strong t="a*/"><code>x /</code>/</strong></p>
```

:::

::: compare

```carve
_*`x /`/*a*/
```

```html
<p>_<strong><code>x /</code>/*a</strong>/</p>
```

:::

::: compare

```carve
_*`x /`/*a*/_
```

```html
<p><u><strong><code>x /</code>/*a</strong>/</u></p>
```

:::

::: compare

```carve
_*`x /`/*a_
```

```html
<p><u>*<code>x /</code>/*a</u></p>
```

:::

::: compare

```carve
_*`x /`/*a
```

```html
<p>_*<code>x /</code>/*a</p>
```

:::

::: compare

```carve
_*`x /`/*{c}_*/
```

```html
<p><u><strong c=""><code>x /</code>/</strong></u>*/</p>
```

:::

::: compare

```carve
_*`x /`/*{c}_*/_
```

```html
<p><u><strong c=""><code>x /</code>/</strong></u>*/_</p>
```

:::

::: compare

```carve
_*`x /`/*{c}__
```

```html
<p><u><strong c=""><code>x /</code>/</strong></u>_</p>
```

:::

::: compare

```carve
_*`x /`/*{c}_
```

```html
<p><u><strong c=""><code>x /</code>/</strong></u></p>
```

:::
