<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('notes:notify-due')->dailyAt('08:00');
Schedule::command('reports:monthly-reset')->monthlyOn(1, '01:00');
