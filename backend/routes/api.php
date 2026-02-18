<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\AccountController;
use App\Http\Controllers\API\ExpenseController;
use App\Http\Controllers\API\IncomeController;
use App\Http\Controllers\API\JarController;
use App\Http\Controllers\API\NoteController;
use App\Http\Controllers\API\StatsController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:api');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:api');
});

Route::middleware('auth:api')->group(function () {
    Route::get('/budgets', [JarController::class, 'index']);
    Route::get('/budgets/{jar}', [JarController::class, 'show']);
    Route::post('/budgets', [JarController::class, 'store']);
    Route::get('/budgets/{jar}/transactions', [JarController::class, 'getTransactions']);
    Route::post('/budgets/{jar}/add-money', [JarController::class, 'addMoney']);
    Route::patch('/budgets/{jar}', [JarController::class, 'update']);
    Route::delete('/budgets/{jar}', [JarController::class, 'destroy']);

    Route::get('/incomes', [IncomeController::class, 'index']);
    Route::post('/incomes', [IncomeController::class, 'store']);
    Route::get('/incomes/{income}', [IncomeController::class, 'show']);
    Route::patch('/incomes/{income}', [IncomeController::class, 'update']);
    Route::delete('/incomes/{income}', [IncomeController::class, 'destroy']);

    Route::get('/expenses', [ExpenseController::class, 'index']);
    Route::post('/expenses', [ExpenseController::class, 'store']);
    Route::get('/expenses/{expense}', [ExpenseController::class, 'show']);
    Route::patch('/expenses/{expense}', [ExpenseController::class, 'update']);
    Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy']);

    Route::get('/notes', [NoteController::class, 'index']);
    Route::post('/notes', [NoteController::class, 'store']);
    Route::patch('/notes/{note}', [NoteController::class, 'update']);
    Route::delete('/notes/{note}', [NoteController::class, 'destroy']);

    Route::get('/stats/spending', [StatsController::class, 'getSpendingAnalytics']);
    Route::get('/stats/income-vs-expenses', [StatsController::class, 'getIncomeVsExpenses']);
    Route::get('/stats/summary', [StatsController::class, 'getSummary']);
    Route::get('/reports/monthly', [StatsController::class, 'getMonthlyReports']);

    Route::patch('/account/profile', [AccountController::class, 'updateProfile']);
    Route::patch('/account/password', [AccountController::class, 'updatePassword']);
    Route::post('/account/reset-data', [AccountController::class, 'resetData']);
});
