use serde_json::{Value, json};
use serde::Deserialize;
use std::io::{self, Read};
use std::sync::Arc;
use std::collections::BTreeMap;

fn diagnostics(items: Vec<carve2::diagnostic::Diagnostic>) -> Value {
    Value::Array(items.into_iter().map(|d| json!({
        "code": d.code, "channel": d.channel, "severity": d.severity,
        "message": d.message, "path": d.path, "file": d.file,
        "line": d.pos.as_ref().map(|p| p.start_line),
        "column": d.pos.as_ref().map(|p| p.start_column),
        "endLine": d.pos.as_ref().map(|p| p.end_line),
        "endColumn": d.pos.as_ref().map(|p| p.end_column),
    })).collect())
}

fn options(v: &Value, files: Option<&Value>) -> carve2::Options {
    let mut o = carve2::Options::default();
    for (name, slot) in [
        ("roundtrip", &mut o.roundtrip), ("rawHtml", &mut o.raw_html),
        ("sections", &mut o.sections), ("smartTypography", &mut o.smart_typography),
        ("sourceLines", &mut o.source_lines), ("strictLosses", &mut o.strict_losses),
    ] {
        if let Some(value) = v[name].as_bool() { *slot = value; }
    }
    if let Some(h) = v["headingIds"].as_str().and_then(carve2::options::HeadingIds::from_name) {
        o.heading_ids = h;
    }
    if let Some(p) = v["profile"].as_str().and_then(carve2::options::Profile::from_name) {
        o.profile = p;
    }
    if v["mode"] == "static" { o.mode = carve2::options::Mode::Static; }
    if let Some(social) = v["social"].as_object() {
        o.social = Some(carve2::options::Social {
            mention_url: social.get("mentionUrl").and_then(Value::as_str).map(str::to_owned),
            tag_url: social.get("tagUrl").and_then(Value::as_str).map(str::to_owned),
        });
    }
    if let Some(allow) = v["urlPolicy"]["allow"].as_array() {
        o.url_policy = carve2::options::UrlPolicy::Allow(allow.iter().filter_map(Value::as_str).map(str::to_owned).collect());
    } else if let Some(deny) = v["urlPolicy"]["deny"].as_array() {
        o.url_policy = carve2::options::UrlPolicy::Deny(deny.iter().filter_map(Value::as_str).map(str::to_owned).collect());
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
        let resolver: carve2::include::Resolver = Arc::new(move |request| map.get(request.path)
            .map(|bytes| (bytes.clone(), request.path.to_string())).ok_or(carve2::include::Cause::NotFound));
        let mut includes = carve2::include::Includes::new(resolver);
        includes.file = v["includes"]["file"].as_str().map(str::to_owned);
        if let Some(depth) = v["includes"]["depth"].as_u64() { includes.depth = depth as usize; }
        if let Some(bytes) = v["includes"]["bytes"].as_u64() { includes.bytes = bytes as usize; }
        o.includes = Some(includes);
    }
    o
}

fn run(c: &Value) -> Value {
    let kind = c["kind"].as_str().unwrap_or("render");
    let input = c["input"].as_str().or_else(|| c["source"].as_str()).unwrap_or("");
    let o = options(&c["options"], c.get("files"));
    match kind {
        "render" | "include" | "parse" => {
            if c.get("inputBytes").is_some() || c["options"].get("extensions").is_some() {
                return json!({"unsupported":"case options need a resolver or host configuration"});
            }
            let tree = if c.get("tree").is_some() && kind == "render" {
                match carve2::reader::read_tree_value(c["tree"].clone()) {
                    Ok(read) => match carve2::render_tree_with_diagnostics(read.document(), &o) {
                        Ok(out) => return json!({"html":out.html,"diagnostics":diagnostics(out.diagnostics)}),
                        Err(e) => return json!({"error":e.to_string()}),
                    },
                    Err(e) => return json!({"error":e.to_string()}),
                }
            } else { carve2::tree_json(input, &o) };
            let tree: Value = serde_json::from_str(&tree).unwrap_or(Value::Null);
            if kind == "parse" {
                let parsed = carve2::render_with_diagnostics(input, &o);
                return json!({"tree":tree,"diagnostics":diagnostics(parsed.diagnostics.into_iter().filter(|d| d.channel == "parse").collect())});
            }
            let output = carve2::render_with_diagnostics(input, &o);
            let mut found = output.diagnostics;
            if c["area"] == "examples" && c["expected"].get("diagnostics").is_some() {
                let mut lint = carve2::lint::LintOptions::default();
                lint.includes = o.includes.clone();
                found.extend(carve2::lint::lint(input, &lint));
            }
            json!({"tree":tree,"html":output.html,"diagnostics":diagnostics(found)})
        }
        "lint" => {
            if c["options"].get("extensions").is_some() { return json!({"unsupported":"lint extension"}); }
            let mut opts = carve2::lint::LintOptions::default();
            opts.includes = o.includes.clone();
            if let Some(rules) = c["options"]["rules"].as_object() {
                opts.rules = rules.iter().filter_map(|(k,v)| v.as_str().map(|s|(k.clone(),s.to_string()))).collect();
            }
            if let Some(platforms) = c["options"]["platforms"].as_array() {
                opts.platforms = platforms.iter().filter_map(|p|p.as_str().map(str::to_owned)).collect();
            }
            json!({"diagnostics":diagnostics(carve2::lint::lint(input, &opts))})
        }
        "tree-fixture" => json!({"accepted":true,"tree":serde_json::from_str::<Value>(&carve2::tree_json(input, &o)).unwrap_or(Value::Null)}),
        "tree" | "refused-tree" | "supplied-tree" => {
            let result = if let Some(source) = c["json"].as_str() { carve2::reader::read_tree_json(source) }
                else { carve2::reader::read_tree_value(c["tree"].clone()) };
            match result {
                Ok(read) => json!({"accepted":true,"tree":serde_json::from_str::<Value>(&carve2::reader::write_tree_json(&read)).unwrap_or(Value::Null)}),
                Err(e) => {
                    let path = match &e {
                        carve2::reader::TreeError::Schema { path, .. }
                        | carve2::reader::TreeError::Reader { path, .. }
                        | carve2::reader::TreeError::Decode { path, .. } => path.as_str(),
                        carve2::reader::TreeError::Json(_) => "",
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
