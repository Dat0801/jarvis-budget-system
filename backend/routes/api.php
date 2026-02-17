<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\ExpenseController;
use App\Http\Controllers\API\IncomeController;
use App\Http\Controllers\API\JarController;
use App\Http\Controllers\API\NoteController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth:api')->group(function () {
    Route::get('/jars', [JarController::class, 'index']);
    Route::post('/jars', [JarController::class, 'store']);
    Route::patch('/jars/{jar}', [JarController::class, 'update']);
    Route::delete('/jars/{jar}', [JarController::class, 'destroy']);

    Route::post('/incomes', [IncomeController::class, 'store']);
    Route::post('/expenses', [ExpenseController::class, 'store']);

    Route::get('/notes', [NoteController::class, 'index']);
    Route::post('/notes', [NoteController::class, 'store']);
    Route::patch('/notes/{note}', [NoteController::class, 'update']);
    Route::delete('/notes/{note}', [NoteController::class, 'destroy']);
});
