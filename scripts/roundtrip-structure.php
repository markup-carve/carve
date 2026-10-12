<?php
// One process reads a JSON file list and emits one result per document and target.
require $argv[1] . '/vendor/autoload.php';
use MarkupCarve\Carve\Ast\AstCodec;
use MarkupCarve\Carve\CarveConverter;
use MarkupCarve\Carve\Converter\HtmlToCarve;
use MarkupCarve\Carve\Converter\MarkdownToCarve;
use MarkupCarve\Carve\Parser\BlockParser;
use MarkupCarve\Carve\Renderer\MarkdownRenderer;
$codec = new AstCodec();
$parse = fn(string $s) => $codec->encode((new BlockParser(false, false, false, true))->parse($s));
$request = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);
foreach ($request['files'] as $file) {
    foreach ($request['targets'] as $target) {
        try {
            $src = file_get_contents($file);
            $a = $parse($src);
            if ($target === 'md') {
                $mid = (new CarveConverter(renderer: (new MarkdownRenderer())->setRoundTripMode(true)))->convert($src);
                $back = (new MarkdownToCarve())->convert($mid);
            } else {
                $mid = (new CarveConverter(roundTripMode: true))->convert($src);
                $back = (new HtmlToCarve())->convert($mid);
            }
            $row = ['file' => basename($file), 'target' => $target, 'before' => $a, 'after' => $parse($back)];
        } catch (Throwable $e) {
            $row = ['file' => basename($file), 'target' => $target, 'error' => get_class($e), 'message' => $e->getMessage()];
        }
        echo json_encode($row, JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE) . "\n";
    }
}
