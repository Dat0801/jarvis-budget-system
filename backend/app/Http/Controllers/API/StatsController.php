<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Income;
use App\Models\MonthlyReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

        $expenseBaseQuery = Expense::query()
            ->where('expenses.user_id', $user->id)
            ->whereBetween('spent_at', [$startDate, $endDate]);

        $totalExpenses = (float) (clone $expenseBaseQuery)->sum('amount');

        $expensesByBudget = (clone $expenseBaseQuery)
            ->leftJoin('jars', 'jars.id', '=', 'expenses.jar_id')
            ->groupBy('expenses.jar_id', 'jars.name', 'jars.color')
            ->selectRaw('expenses.jar_id as budget_id, COALESCE(jars.name, ?) as budget_name, COALESCE(jars.color, ?) as budget_color, SUM(expenses.amount) as amount', ['Unknown', '#667eea'])
            ->orderByDesc('amount')
            ->get()
            ->map(function ($row) use ($totalExpenses) {
                $amount = (float) $row->amount;

                return [
                    'budget_id' => $row->budget_id,
                    'budget_name' => $row->budget_name,
                    'budget_color' => $row->budget_color,
                    'amount' => round($amount, 2),
                    'percentage' => $totalExpenses > 0 ? round(($amount / $totalExpenses) * 100, 2) : 0,
                ];
            })
            ->values();

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

        $startMonth = Carbon::now()->subMonths(5)->startOfMonth();
        $endMonth = Carbon::now()->endOfMonth();

        $incomeYearMonthExpr = $this->getYearMonthExpressionForColumn('received_at');
        $expenseYearMonthExpr = $this->getYearMonthExpressionForColumn('spent_at');

        $incomeByMonth = Income::query()
            ->where('user_id', $user->id)
            ->whereBetween('received_at', [$startMonth, $endMonth])
            ->whereNotNull('received_at')
            ->selectRaw("{$incomeYearMonthExpr} as ym, SUM(amount) as total")
            ->groupByRaw($incomeYearMonthExpr)
            ->pluck('total', 'ym');

        $expenseByMonth = Expense::query()
            ->where('user_id', $user->id)
            ->whereBetween('spent_at', [$startMonth, $endMonth])
            ->whereNotNull('spent_at')
            ->selectRaw("{$expenseYearMonthExpr} as ym, SUM(amount) as total")
            ->groupByRaw($expenseYearMonthExpr)
            ->pluck('total', 'ym');

        $months = [];
        $incomes = [];
        $expenses = [];

        $cursor = $startMonth->copy();
        while ($cursor->lessThanOrEqualTo($endMonth)) {
            $key = $cursor->format('Y-m');
            $months[] = $cursor->format('M');
            $incomes[] = round((float) ($incomeByMonth[$key] ?? 0), 2);
            $expenses[] = round((float) ($expenseByMonth[$key] ?? 0), 2);
            $cursor->addMonthNoOverflow();
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

    private function getYearMonthExpressionForColumn(string $column): string
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            return "TO_CHAR({$column}, 'YYYY-MM')";
        }

        if ($driver === 'sqlite') {
            return "strftime('%Y-%m', {$column})";
        }

        return "DATE_FORMAT({$column}, '%Y-%m')";
    }
}
