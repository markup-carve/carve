# Import comparison inputs

`commonmark.json` contains all 652 examples from
[CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/spec.json).
The Markdown and expected HTML are separate importer inputs. The examples retain
upstream numbering, section names and source lines. They are licensed under
CC BY-SA 4.0; see `COMMONMARK-LICENSE` for attribution and upstream license terms.
Only JSON formatting changed.

`djot.json` contains the 277 input examples in `test/*.test` from
[djot.js at 596e7fcf487f35c739de6a9c33e9a944c1927e56](https://github.com/jgm/djot.js/tree/596e7fcf487f35c739de6a9c33e9a944c1927e56/test).
The id records the file and opening fence line. Source, options, filters and
expected output are retained; the MIT license is in `DJOT-LICENSE`.
The comparison imports source only. It does not apply the three Lua filters or
compare against upstream HTML or AST snapshots.

`targets.json` records shared Carve output meanings for the two cases in
[carve#2493](https://github.com/markup-carve/carve/issues/2493), including their
HTML equivalents. Public-suite comparisons measure agreement between importers;
these four targets also catch engines agreeing on the same incorrect output.
