<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Income;
use App\Models\User;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $income = Income::query()->select('id', 'amount', 'jar_id', 'created_at')->get();
        $expenses = Expense::query()->select('id', 'amount', 'jar_id', 'created_at')->get();

        $transactions = $income
            ->map(fn ($item) => [
                'id' => $item->id,
                'type' => 'income',
                'jar_id' => $item->jar_id,
                'amount' => $item->amount,
                'created_at' => $item->created_at,
            ])
            ->merge($expenses->map(fn ($item) => [
                'id' => $item->id,
                'type' => 'expense',
                'jar_id' => $item->jar_id,
                'amount' => $item->amount,
                'created_at' => $item->created_at,
            ]))
            ->sortByDesc('created_at')
            ->values();

        return Inertia::render('Admin/Dashboard', [
            'totals' => [
                'users' => User::query()->count(),
                'income' => Income::query()->sum('amount'),
                'expenses' => Expense::query()->sum('amount'),
            ],
            'transactions' => $transactions,
        ]);
    }
}
