<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$request = Illuminate\Http\Request::create(
    '/api/admin/salary-payments/calculate-commission',
    'GET',
    ['employee_id' => 1, 'month' => 3, 'year' => 2083]
);

$controller = new App\Http\Controllers\Api\SalaryPaymentController();
$response = $controller->calculateCommission($request);

echo "Status: " . $response->getStatusCode() . "\n";
echo "Content:\n";
print_r(json_decode($response->getContent(), true));
