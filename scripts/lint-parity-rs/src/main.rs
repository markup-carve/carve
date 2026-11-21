// Lint driver for scripts/lint-parity.mjs: stdin [{source, extensions}], stdout one finding list per case.
use serde_json::{Value, json};
use std::io::{self, Read};

fn main() {
    let mut data = String::new();
    io::stdin().read_to_string(&mut data).expect("stdin");
    let cases: Vec<Value> = serde_json::from_str(&data).expect("cases");
    let core = carve::lint::LintOptions::default();
    let mut ext = carve::lint::LintOptions::default();
    ext.extensions = ["carve.cite", "carve.references", "carve.term", "carve.glossary"]
        .map(str::to_owned)
        .to_vec();
    let out: Vec<Value> = cases
        .iter()
        .map(|c| {
            let source = c["source"].as_str().unwrap_or("");
            let opts = if c["extensions"].as_bool() == Some(true) { &ext } else { &core };
            let found = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| carve::lint::lint(source, opts)));
            match found {
                Ok(items) => Value::Array(
                    items
                        .into_iter()
                        .filter(|d| d.channel == "lint")
                        .map(|d| {
                            json!({
                                "code": d.code,
                                "start": d.pos.as_ref().map(|p| p.start_offset),
                                "end": d.pos.as_ref().map(|p| p.end_offset),
                                "message": d.message,
                            })
                        })
                        .collect(),
                ),
                Err(_) => json!([{"code": "ERROR:panic", "start": null, "end": null, "message": ""}]),
            }
        })
        .collect();
    println!("{}", Value::Array(out));
}
