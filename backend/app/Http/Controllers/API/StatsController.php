<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Income;
use App\Models\MonthlyReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class StatsController extends Controller
{
    /**
     * Get spending analytics for a specific month
     */
    public function getSpendingAnalytics(Request $request)
    {
        $user = Auth::user();
        $month = $request->query('month', Carbon::now());
        
        if (is_string($month)) {
            $month = Carbon::createFromFormat('Y-m', $month);
        }

        $startDate = $month->copy()->startOfMonth();
        $endDate = $month->copy()->endOfMonth();

        // Get total expenses for the month
        $totalExpenses = Expense::where('user_id', $user->id)
            ->whereBetween('spent_at', [$startDate, $endDate])
            ->sum('amount');

        // Get expenses grouped by budget
        $expensesByBudget = Expense::where('user_id', $user->id)
            ->whereBetween('spent_at', [$startDate, $endDate])
            ->with('jar')
            ->get()
            ->groupBy('jar_id')
            ->map(function ($expenses, $jarId) {
                $jar = $expenses->first()->jar;
                return [
                    'budget_id' => $jarId,
                    'budget_name' => $jar?->name ?? 'Unknown',
                    'budget_color' => $jar?->color ?? '#667eea',
                    'amount' => $expenses->sum('amount'),
                    'percentage' => 0, // Will be calculated below
                ];
            })
            ->values();

        // Calculate percentages
        if ($totalExpenses > 0) {
            $expensesByBudget->each(function ($item) use ($totalExpenses) {
                $item['percentage'] = round(($item['amount'] / $totalExpenses) * 100, 2);
            });
        }

        return response()->json([
            'month' => $month->format('Y-m'),
            'total_spent' => round($totalExpenses, 2),
            'expenses_by_budget' => $expensesByBudget,
        ]);
    }

    /**
     * Get income vs expenses data for the last 6 months
     */
    public function getIncomeVsExpenses()
    {
        $user = Auth::user();
        $months = [];
        $incomes = [];
        $expenses = [];

        // Get data for the last 6 months
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $startDate = $date->copy()->startOfMonth();
            $endDate = $date->copy()->endOfMonth();

            $months[] = $date->format('M');

            $totalIncome = Income::where('user_id', $user->id)
                ->whereBetween('received_at', [$startDate, $endDate])
                ->sum('amount');

            $totalExpense = Expense::where('user_id', $user->id)
                ->whereBetween('spent_at', [$startDate, $endDate])
                ->sum('amount');

            $incomes[] = round($totalIncome, 2);
            $expenses[] = round($totalExpense, 2);
        }

        return response()->json([
            'months' => $months,
            'income' => $incomes,
            'expenses' => $expenses,
        ]);
    }

    /**
     * Get current month summary
     */
    public function getSummary()
    {
        $user = Auth::user();
        $now = Carbon::now();
        $startDate = $now->copy()->startOfMonth();
        $endDate = $now->copy()->endOfMonth();

        $totalIncome = Income::where('user_id', $user->id)
            ->whereBetween('received_at', [$startDate, $endDate])
            ->sum('amount');

        $totalExpense = Expense::where('user_id', $user->id)
            ->whereBetween('spent_at', [$startDate, $endDate])
            ->sum('amount');

        $balance = $totalIncome - $totalExpense;

        return response()->json([
            'month' => $now->format('F Y'),
            'total_income' => round($totalIncome, 2),
            'total_expenses' => round($totalExpense, 2),
            'balance' => round($balance, 2),
        ]);
    }

    /**
     * Get generated monthly reports
     */
    public function getMonthlyReports()
    {
        $user = Auth::user();

        $reports = MonthlyReport::query()
            ->where('user_id', $user->id)
            ->orderByDesc('month')
            ->paginate(12);

        return response()->json($reports);
    }
}
