use serde_json::{json, Value};
use std::io::{self, Read, Write};
use std::path::Path;

fn parse(source: &str) -> Result<String, String> {
    carve::try_to_json_with_options(source, &carve::Options::default().with_positions(true))
        .map_err(|error| error.to_string())
}

fn roundtrip(source: &str, target: &str) -> Result<String, String> {
    let mut options = carve::Options::default();
    options.roundtrip = true;
    let back = if target == "html" {
        let mid =
            carve::try_to_html_with_options(source, &options).map_err(|error| error.to_string())?;
        carve::migrate_html(&mid, &carve::HtmlImportOptions::default())
            .map_err(|error| format!("{error:?}"))?
            .value
    } else {
        let mid = carve::try_to_markdown_with_options(source, &options.with_positions(true))
            .map_err(|error| error.to_string())?;
        carve::try_migrate_markdown(&mid)
            .map_err(|error| error.to_string())?
            .value
    };
    parse(&back)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input)?;
    let request: Value = serde_json::from_str(&input)?;
    let files = request["files"].as_array().ok_or("missing files")?;
    let targets = request["targets"].as_array().ok_or("missing targets")?;
    let mut output = io::BufWriter::new(io::stdout().lock());
    for file in files {
        let file = file.as_str().ok_or("invalid file")?;
        let source = std::fs::read_to_string(file).map_err(|error| error.to_string());
        let before = std::panic::catch_unwind(|| {
            source
                .as_ref()
                .map_err(Clone::clone)
                .and_then(|source| parse(source))
        })
        .unwrap_or_else(|_| Err("initial parse panicked".to_owned()));
        for target in targets {
            let target = target.as_str().ok_or("invalid target")?;
            if !matches!(target, "html" | "md") {
                return Err("invalid target".into());
            }
            let result = std::panic::catch_unwind(|| {
                let before = before.as_ref().map_err(Clone::clone)?;
                let after = roundtrip(source.as_ref().map_err(Clone::clone)?, target)?;
                Ok::<_, String>((before, after))
            });
            let filename = Path::new(file)
                .file_name()
                .ok_or("invalid file name")?
                .to_string_lossy();
            let row = match result {
                // Preserve AST key order for the reference's first-difference traversal.
                Ok(Ok((before, after))) => format!(
                    r#"{{"file":{},"target":{},"before":{},"after":{}}}"#,
                    serde_json::to_string(&filename)?,
                    serde_json::to_string(target)?,
                    before,
                    after
                ),
                Ok(Err(message)) => serde_json::to_string(
                    &json!({ "file": filename, "target": target, "error": "RustError", "message": message }),
                )?,
                Err(_) => serde_json::to_string(
                    &json!({ "file": filename, "target": target, "error": "RustPanic", "message": "roundtrip panicked" }),
                )?,
            };
            writeln!(output, "{row}")?;
            output.flush()?;
        }
    }
    Ok(())
}
