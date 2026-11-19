use serde_json::{Value, json};
use serde::Deserialize;
use std::io::{self, Read};
use std::sync::Arc;
use std::collections::BTreeMap;

fn diagnostics(items: Vec<carve::diagnostic::Diagnostic>) -> Value {
    Value::Array(items.into_iter().map(|d| json!({
        "code": d.code, "channel": d.channel, "severity": d.severity,
        "message": d.message, "path": d.path, "file": d.file,
        "line": d.pos.as_ref().map(|p| p.start_line),
        "column": d.pos.as_ref().map(|p| p.start_column),
        "endLine": d.pos.as_ref().map(|p| p.end_line),
        "endColumn": d.pos.as_ref().map(|p| p.end_column),
    })).collect())
}

fn options(v: &Value, files: Option<&Value>) -> carve::Options {
    let mut o = carve::Options::default();
    for (name, slot) in [
        ("roundtrip", &mut o.roundtrip), ("rawHtml", &mut o.raw_html),
        ("sections", &mut o.sections), ("smartTypography", &mut o.smart_typography),
        ("sourceLines", &mut o.source_lines), ("strictLosses", &mut o.strict_losses),
    ] {
        if let Some(value) = v[name].as_bool() { *slot = value; }
    }
    if let Some(h) = v["headingIds"].as_str().and_then(carve::options::HeadingIds::from_name) {
        o.heading_ids = h;
    }
    if let Some(p) = v["profile"].as_str().and_then(carve::options::Profile::from_name) {
        o.profile = p;
    }
    if v["mode"] == "static" { o.mode = carve::options::Mode::Static; }
    if let Some(s) = v["softBreak"].as_str().and_then(carve::options::SoftBreak::from_name) {
        o.soft_break = s;
    }
    if let Some(codes) = v["allowLosses"].as_array() {
        o.allow_losses = codes.iter().filter_map(Value::as_str).map(str::to_owned).collect();
    }
    if let Some(n) = v["maxLosses"].as_u64() { o.max_losses = n as usize; }
    if let Some(social) = v["social"].as_object() {
        o.social = Some(carve::options::Social {
            mention_url: social.get("mentionUrl").and_then(Value::as_str).map(str::to_owned),
            tag_url: social.get("tagUrl").and_then(Value::as_str).map(str::to_owned),
        });
    }
    if let Some(allow) = v["urlPolicy"]["allow"].as_array() {
        o.url_policy = carve::options::UrlPolicy::Allow(allow.iter().filter_map(Value::as_str).map(str::to_owned).collect());
    } else if let Some(deny) = v["urlPolicy"]["deny"].as_array() {
        o.url_policy = carve::options::UrlPolicy::Deny(deny.iter().filter_map(Value::as_str).map(str::to_owned).collect());
    }
    if let Some(symbols) = v["symbols"].as_object() {
        o.symbols = symbols.iter().filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_owned()))).collect();
    }
    if let Some(labels) = v["labels"].as_object() {
        o.labels = labels.iter().filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_owned()))).collect();
    }
    if let Some(files) = files {
        let mut map = BTreeMap::new();
        for (name, file) in files.as_object().into_iter().flatten() {
            let bytes = file.as_str().or_else(|| file["text"].as_str()).map(str::as_bytes).map(<[u8]>::to_vec).unwrap_or_else(|| {
                let hex = file["bytes"].as_str().unwrap_or("").replace(' ', "");
                (0..hex.len()/2).filter_map(|i| u8::from_str_radix(hex.get(i*2..i*2+2)?, 16).ok()).collect()
            });
            map.insert(name.clone(), bytes);
        }
        let resolver: carve::include::Resolver = Arc::new(move |request| map.get(request.path)
            .map(|bytes| (bytes.clone(), request.path.to_string())).ok_or(carve::include::Cause::NotFound));
        let mut includes = carve::include::Includes::new(resolver);
        includes.file = v["includes"]["file"].as_str().map(str::to_owned);
        if let Some(depth) = v["includes"]["depth"].as_u64() { includes.depth = depth as usize; }
        if let Some(bytes) = v["includes"]["bytes"].as_u64() { includes.bytes = bytes as usize; }
        o.includes = Some(includes);
    }
    o
}

/// One request through the binding boundary (`carve::api::json::call`):
/// `Ok` with the result, or `Err` with the case record of a refusal.
fn call(c: &Value, name: &str, options: Value) -> Result<Value, Value> {
    let mut req = json!({"call": name, "options": options});
    if let Some(host) = c.get("host") { req["host"] = host.clone(); }
    if let Some(offset) = c.get("offset") { req["offset"] = offset.clone(); }
    if name == "importDocument" {
        req["from"] = json!("html");
        req["source"] = c["html"].clone();
    } else if c.get("tree").is_some() && !name.starts_with("parse") && !name.starts_with("format") {
        req["tree"] = c["tree"].clone();
    } else if let Some(hex) = c["inputBytes"].as_str() {
        let hex = hex.replace(' ', "");
        req["sourceBytes"] = (0..hex.len() / 2).filter_map(|i| u8::from_str_radix(hex.get(i*2..i*2+2)?, 16).ok()).collect();
    } else {
        req["source"] = json!(c["input"].as_str().or_else(|| c["source"].as_str()).unwrap_or(""));
    }
    invoke(req)
}

fn invoke(req: Value) -> Result<Value, Value> {
    let out: Value = serde_json::from_str(&carve::api::json::call(&req.to_string())).unwrap_or(Value::Null);
    match out.get("ok") {
        Some(ok) => Ok(ok.clone()),
        None => Err(json!({"accepted":false,"error":out["error"]["name"],"message":out["error"]["message"],"path":out["error"]["path"]})),
    }
}

fn strip_positions(tree: &mut Value) {
    match tree {
        Value::Object(fields) => {
            fields.remove("pos");
            for value in fields.values_mut() { strip_positions(value); }
        }
        Value::Array(items) => for value in items { strip_positions(value); },
        _ => {}
    }
}

fn tree_from(source: &str) -> Result<Value, Value> {
    let mut tree = call(&json!({"input":source}), "parse", json!({}))?["tree"].clone();
    strip_positions(&mut tree);
    Ok(tree)
}

fn patch_case(c: &Value, kind: &str) -> Result<Value, Value> {
    let source = c["input"].as_str().or_else(|| c["source"].as_str()).unwrap_or("");
    if kind == "fingerprint" {
        return if c["of"] == "tree" {
            invoke(json!({"call":"treeFingerprint","tree":tree_from(source)?}))
        } else { call(c, "sourceFingerprint", json!({})) };
    }
    let tree = tree_from(source)?;
    if kind == "diff" {
        let after = tree_from(c["inputAfter"].as_str().unwrap_or(""))?;
        let patch = invoke(json!({"call":"diffTree","a":tree,"b":after}))?["patch"].clone();
        let applied = invoke(json!({"call":"applyPatch","tree":tree,"patch":patch}))?["tree"].clone();
        return Ok(json!({"patch":patch,"applies":applied == after}));
    }
    let mut request = json!({"call":"applyPatch","tree":tree,"patch":c["patch"]});
    if let Some(fingerprint_source) = c["fingerprintOf"].as_str() {
        request["fingerprint"] = invoke(json!({"call":"treeFingerprint","tree":tree_from(fingerprint_source)?}))?["fingerprint"].clone();
    }
    invoke(request)
}

fn parse_options(v: &Value) -> Value {
    Value::Object(v.as_object().into_iter().flatten()
        .filter(|(k, _)| ["includes", "extensions", "headingIds"].contains(&k.as_str()))
        .map(|(k, v)| (k.clone(), v.clone())).collect())
}

/// Kinds and options the direct calls below cannot express: the writer, the
/// importer, migration, positions, standard extensions and host document transforms.
fn run_boundary(c: &Value, kind: &str) -> Result<Value, Value> {
    let opts = c.get("options").cloned().unwrap_or_else(|| json!({}));
    Ok(match kind {
        "format" | "write-example" => {
            let r = call(c, "formatWithDiagnostics", opts.clone())?;
            let mut out = json!({"carve": r["source"], "diagnostics": r["diagnostics"]});
            if kind == "write-example" {
                out["tree"] = call(c, "parse", parse_options(&opts))?["tree"].take();
                if c["expected"].get("html").is_some() {
                    out["html"] = call(c, "render", parse_options(&opts))?["html"].take();
                }
            }
            out
        }
        "write" if c.get("layout").is_some() => {
            // The boundary has no layout field (C2-W-001), so this case writes through the library.
            let refused = |e: carve::api::Error| json!({"accepted":false,"error":e.spec_name(),"message":e.to_string()});
            let mut host = carve::api::Carve::default();
            let mut w = carve::api::WriteOptions::default();
            for ext in opts["extensions"].as_array().into_iter().flatten().filter_map(Value::as_str) {
                host.enable_standard(ext, false).map_err(refused)?;
                w.extensions.push(ext.to_owned());
            }
            w.layout = Some(c["layout"].clone());
            let tree = carve::api::decode_tree(&c["tree"].to_string()).map_err(refused)?;
            let r = host.write_with_diagnostics(&tree, &w).map_err(refused)?;
            json!({"carve": r.output, "diagnostics": r.diagnostics})
        }
        "write" => {
            let r = call(c, "writeWithDiagnostics", opts)?;
            json!({"carve": r["output"], "diagnostics": r["diagnostics"]})
        }
        "import" => {
            let r = call(c, "importDocument", opts)?;
            json!({"tree": r["tree"], "carve": r["source"], "diagnostics": r["diagnostics"]})
        }
        "parse" => {
            let mut r = call(c, "parseWithDiagnostics", opts)?;
            let parse = r["diagnostics"].as_array().into_iter().flatten().filter(|d| d["channel"] == "parse").cloned().collect::<Vec<_>>();
            json!({"tree": r["tree"].take(), "diagnostics": parse})
        }
        "layout" => {
            let mut r = call(c, "parseWithLayout", opts)?;
            json!({"tree": r["tree"].take(), "layout": r["layout"].take(),
                "diagnostics": r["diagnostics"].take()})
        }
        "lint" => json!({"diagnostics": call(c, "lint", opts)?["diagnostics"]}),
        "migrate" => {
            let mut r = call(c, "migrateTree", opts)?;
            json!({"tree": r["tree"].take(), "diagnostics": r["diagnostics"].take()})
        }
        "position" => {
            let r = call(c, "positionOf", opts)?;
            json!({"line": r["line"], "column": r["column"]})
        }
        _ => {
            let mut r = call(c, "renderWithDiagnostics", opts.clone())?;
            let mut out = json!({"html": r["html"].take(), "diagnostics": r["diagnostics"].take(), "suppressed": r["suppressedDiagnostics"]});
            if c.get("tree").is_none() { out["tree"] = call(c, "parse", parse_options(&opts))?["tree"].take(); }
            out
        }
    })
}

fn run(c: &Value) -> Value {
    let kind = c["kind"].as_str().unwrap_or("render");
    let input = c["input"].as_str().or_else(|| c["source"].as_str()).unwrap_or("");
    let boundary = matches!(kind, "format" | "write" | "write-example" | "import" | "migrate" | "position" | "diff" | "patch" | "fingerprint" | "layout")
        || (matches!(kind, "render" | "parse" | "lint") && (c["options"].get("extensions").is_some() || c.get("host").is_some()));
    if c["options"]["renderers"].as_object().is_some_and(|r| r.values().any(|v| v != "standard")) {
        // Let the JSON boundary accept renderer host options when the pinned engine offers them.
        // Its current renderers option takes only the string "standard".
        return run_boundary(c, kind).unwrap_or_else(|refused| {
            if refused["error"] == "CarveOptionError" && refused["path"] == "/renderers" {
                json!({"unsupported":"standard renderer host options are not offered"})
            } else { refused }
        });
    }
    if boundary && c.get("files").is_none() {
        if c["options"].get("codeBlockRenderer").is_some() {
            return json!({"unsupported":"codeBlockRenderer is a host function"});
        }
        return if matches!(kind, "diff" | "patch" | "fingerprint") {
            patch_case(c, kind).unwrap_or_else(|refused| refused)
        } else { run_boundary(c, kind).unwrap_or_else(|refused| refused) };
    }
    let o = options(&c["options"], c.get("files"));
    match kind {
        "layout" => match carve::api::parse_with_layout(input, &o) {
            Ok(result) => json!({"tree":serde_json::from_str::<Value>(&carve::api::encode_tree(&result.tree)).unwrap_or(Value::Null),
                "layout":result.layout,"diagnostics":result.diagnostics}),
            Err(error) => json!({"accepted":false,"error":error.spec_name(),"path":error.path()}),
        },
        "layout-fixture" => {
            if let Err(error) = carve::api::validate_layout(&c["layout"]) {
                return json!({"accepted":false,"error":error.spec_name(),"path":error.path()});
            }
            let parsed = if let Some(hex) = c["input"].as_str() {
                let hex = hex.replace(' ', "");
                let bytes: Vec<u8> = (0..hex.len() / 2)
                    .filter_map(|i| u8::from_str_radix(hex.get(i * 2..i * 2 + 2)?, 16).ok())
                    .collect();
                carve::api::parse_with_layout(&bytes, &o)
            } else {
                carve::api::parse_with_layout(c["layout"]["source"].as_str().unwrap_or(""), &o)
            };
            match parsed {
                Ok(result) => json!({"accepted":true,"layout":result.layout}),
                Err(error) => json!({"accepted":false,"error":error.spec_name(),"path":error.path()}),
            }
        }
        "render" | "include" | "parse" => {
            if c.get("inputBytes").is_some() || c["options"].get("extensions").is_some() {
                return json!({"unsupported":"case options need a resolver or host configuration"});
            }
            let tree = if c.get("tree").is_some() && kind == "render" {
                match carve::reader::read_tree_value(c["tree"].clone()) {
                    Ok(read) => match carve::render_tree_with_diagnostics(read.document(), &o) {
                        Ok(out) => return json!({"html":out.html,"diagnostics":diagnostics(out.diagnostics)}),
                        Err(e) => return json!({"error":e.to_string()}),
                    },
                    Err(e) => return json!({"error":e.to_string()}),
                }
            } else { carve::tree_json(input, &o) };
            let tree: Value = serde_json::from_str(&tree).unwrap_or(Value::Null);
            if kind == "parse" {
                let parsed = carve::render_with_diagnostics(input, &o);
                return json!({"tree":tree,"diagnostics":diagnostics(parsed.diagnostics.into_iter().filter(|d| d.channel == "parse").collect())});
            }
            let output = carve::render_with_diagnostics(input, &o);
            let mut found = output.diagnostics;
            if c["area"] == "examples" && c["expected"].get("diagnostics").is_some() {
                let mut lint = carve::lint::LintOptions::default();
                lint.includes = o.includes.clone();
                found.extend(carve::lint::lint(input, &lint));
            }
            json!({"tree":tree,"html":output.html,"diagnostics":diagnostics(found)})
        }
        "lint" => {
            let mut opts = carve::lint::LintOptions::default();
            opts.includes = o.includes.clone();
            opts.heading_ids = o.heading_ids;
            opts.extensions = c["options"]["extensions"].as_array().into_iter().flatten()
                .filter_map(Value::as_str).map(str::to_owned).collect();
            if let Some(rules) = c["options"]["rules"].as_object() {
                opts.rules = rules.iter().filter_map(|(k,v)| v.as_str().map(|s|(k.clone(),s.to_string()))).collect();
            }
            if let Some(platforms) = c["options"]["platforms"].as_array() {
                opts.platforms = platforms.iter().filter_map(|p|p.as_str().map(str::to_owned)).collect();
            }
            json!({"diagnostics":diagnostics(carve::lint::lint(input, &opts))})
        }
        "tree-fixture" => json!({"accepted":true,"tree":serde_json::from_str::<Value>(&carve::tree_json(input, &o)).unwrap_or(Value::Null)}),
        "tree" | "refused-tree" | "supplied-tree" => {
            let result = if let Some(source) = c["json"].as_str() { carve::reader::read_tree_json(source) }
                else { carve::reader::read_tree_value(c["tree"].clone()) };
            match result {
                Ok(read) => json!({"accepted":true,"tree":serde_json::from_str::<Value>(&carve::reader::write_tree_json(&read)).unwrap_or(Value::Null)}),
                Err(e) => {
                    let path = match &e {
                        carve::reader::TreeError::Schema { path, .. }
                        | carve::reader::TreeError::Reader { path, .. }
                        | carve::reader::TreeError::Decode { path, .. } => path.as_str(),
                        carve::reader::TreeError::Json(_) => "",
                    };
                    json!({"accepted":false,"error":"CarveTreeError","path":path})
                },
            }
        }
        _ => json!({"unsupported":format!("{kind} has no 0.2 Rust API")}),
    }
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).expect("read cases");
    let mut de = serde_json::Deserializer::from_str(&input);
    de.disable_recursion_limit();
    let cases = Value::deserialize(&mut de).expect("JSON cases");
    let output: Vec<Value> = cases.as_array().expect("case list").iter().map(run).collect();
    println!("{}", Value::Array(output));
}
