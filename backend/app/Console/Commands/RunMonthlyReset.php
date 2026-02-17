<?php

namespace App\Console\Commands;

use App\Models\Expense;
use App\Models\Income;
use App\Models\MonthlyReport;
use App\Models\User;
use Illuminate\Console\Command;

class RunMonthlyReset extends Command
{
    protected $signature = 'reports:monthly-reset';
    protected $description = 'Generate monthly reports for the previous month';

    public function handle(): int
    {
        $start = now()->subMonthNoOverflow()->startOfMonth();
        $end = now()->subMonthNoOverflow()->endOfMonth();

        User::query()->chunk(200, function ($users) use ($start, $end) {
            foreach ($users as $user) {
                $totalIncome = Income::query()
                    ->where('user_id', $user->id)
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('amount');

                $totalExpenses = Expense::query()
                    ->where('user_id', $user->id)
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('amount');

                MonthlyReport::query()->updateOrCreate(
                    ['user_id' => $user->id, 'month' => $start->toDateString()],
                    [
                        'total_income' => $totalIncome,
                        'total_expenses' => $totalExpenses,
                        'generated_at' => now(),
                    ]
                );
            }
        });

        return self::SUCCESS;
    }
}
