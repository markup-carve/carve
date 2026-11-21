<?php

declare(strict_types=1);

// Lint driver for scripts/lint-parity.mjs: stdin [{source, extensions}], stdout one finding list per case.
use MarkupCarve\Carve\Carve;
use MarkupCarve\Carve\Extension\Citations;
use MarkupCarve\Carve\Extension\Glossary;

$engine = getenv('CARVE_PHP_DIR');
if (!$engine || !is_file($engine . '/vendor/autoload.php')) {
    fwrite(STDERR, "CARVE_PHP_DIR must be an installed next2 checkout\n");
    exit(2);
}
require $engine . '/vendor/autoload.php';

$cases = json_decode((string)stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$extensions = [...Citations::bundle()->definitions(), ...Glossary::bundle()->definitions()];
$out = [];
foreach ($cases as $case) {
    try {
        $found = Carve::lint($case['source'], $case['extensions'] ? ['extensions' => $extensions] : []);
        $list = [];
        foreach ($found as $d) {
            if ($d->channel !== 'lint') {
                continue;
            }
            $list[] = ['code' => $d->code, 'start' => $d->startOffset, 'end' => $d->endOffset, 'message' => $d->message];
        }
        $out[] = $list;
    } catch (Throwable $e) {
        $out[] = [['code' => 'ERROR:' . $e::class, 'start' => null, 'end' => null, 'message' => $e->getMessage()]];
    }
}
echo json_encode($out, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
