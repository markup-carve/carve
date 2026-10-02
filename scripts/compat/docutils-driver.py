import json
import sys
import docutils
from docutils import nodes
from docutils.core import publish_doctree, publish_from_doctree


def encode(node):
    if isinstance(node, nodes.Text):
        return {"type": "text", "value": node.astext()}
    return {
        "type": node.tagname,
        "attributes": node.attributes,
        "children": [encode(child) for child in node.children],
    }


source = sys.stdin.read()
tree = publish_doctree(source, settings_overrides={
    "file_insertion_enabled": False,
    "raw_enabled": False,
    "doctitle_xform": False,
    "sectsubtitle_xform": False,
    "syntax_highlight": "none",
    "halt_level": 2,
    "report_level": 2,
})
html = publish_from_doctree(tree, writer_name="html5", settings_overrides={
    "output_encoding": "unicode",
    "stylesheet_path": [],
    "embed_stylesheet": False,
    "syntax_highlight": "none",
})
print(json.dumps({"version": docutils.__version__, "tree": encode(tree), "html": html}))
