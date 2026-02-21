<?php

$configuredOrigins = array_values(array_filter(array_map(
    static fn (string $origin): string => trim($origin),
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))
)));

$defaultOrigins = [
    'http://localhost:8100',
    'http://127.0.0.1:8100',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost',
];

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_unique(array_filter([...$defaultOrigins, ...$configuredOrigins]))),
    'allowed_origins_patterns' => [
        '/^https?:\/\/192\.168\.\d+\.\d+(?::\d+)?$/',
        '/^https?:\/\/10\.\d+\.\d+\.\d+(?::\d+)?$/',
        '/^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(?::\d+)?$/',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
