<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Income;
use App\Models\Jar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JarController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()
                ->jars()
                ->where('wallet_type', Jar::TYPE_BUDGET)
                ->latest()
                ->get()
        );
    }

    public function show(Request $request, Jar $jar)
    {
        $this->authorizeJarAccess($request, $jar);

        return response()->json($jar);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:255|required_without:category',
            'category' => 'nullable|string|max:255|required_without:name',
            'description' => 'nullable|string',
            'balance' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
            'budget_date' => 'nullable|date',
            'repeat_this_budget' => 'sometimes|boolean',
        ]);

        $resolvedName = $data['name'] ?? $data['category'];
        $resolvedBalance = $data['amount'] ?? ($data['balance'] ?? 0);

        $jar = $request->user()->jars()->create([
            'name' => $resolvedName,
            'category' => $data['category'] ?? $resolvedName,
            'description' => $data['description'] ?? null,
            'balance' => $resolvedBalance,
            'budget_date' => $data['budget_date'] ?? null,
            'repeat_this_budget' => $data['repeat_this_budget'] ?? false,
            'wallet_type' => Jar::TYPE_BUDGET,
            'currency_unit' => 'VND',
            'notifications_enabled' => false,
        ]);

        return response()->json($jar, 201);
    }

    public function update(Request $request, Jar $jar)
    {
        $this->authorizeBudgetJar($request, $jar);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|nullable|string|max:255',
            'description' => 'nullable|string',
            'balance' => 'sometimes|numeric|min:0',
            'amount' => 'sometimes|numeric|min:0',
            'budget_date' => 'sometimes|nullable|date',
            'repeat_this_budget' => 'sometimes|boolean',
        ]);

        if (array_key_exists('amount', $data)) {
            $data['balance'] = $data['amount'];
            unset($data['amount']);
        }

        if (array_key_exists('category', $data) && !array_key_exists('name', $data) && !empty($data['category'])) {
            $data['name'] = $data['category'];
        }

        $jar->update($data);

        return response()->json($jar);
    }

    public function destroy(Request $request, Jar $jar)
    {
        $this->authorizeBudgetJar($request, $jar);
        $jar->delete();

        return response()->json(['message' => 'Budget deleted']);
    }

    public function getTransactions(Request $request, Jar $jar)
    {
        $this->authorizeJarAccess($request, $jar);

        $page = max((int) $request->query('page', 1), 1);
        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);

        $expenseQuery = Expense::query()
            ->where('jar_id', $jar->id)
            ->selectRaw("id, 'expense' as type, amount, category, note, null as source, spent_at as date, created_at");

        $incomeQuery = Income::query()
            ->where('jar_id', $jar->id)
            ->selectRaw("id, 'income' as type, amount, null as category, null as note, source, received_at as date, created_at");

        $combinedQuery = $expenseQuery->unionAll($incomeQuery);

        $transactionsQuery = DB::query()->fromSub($combinedQuery, 'transactions');

        $total = (clone $transactionsQuery)->count();

        $items = (clone $transactionsQuery)
            ->orderByRaw('COALESCE(date, created_at) DESC')
            ->orderByDesc('id')
            ->forPage($page, $perPage)
            ->get();

        return response()->json([
            'data' => $items,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage),
        ]);
    }

    public function addMoney(Request $request, Jar $jar)
    {
        $this->authorizeBudgetJar($request, $jar);

        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01',
        ]);

        $jar->update([
            'balance' => $jar->balance + $data['amount'],
        ]);

        return response()->json($jar);
    }

    private function authorizeJarAccess(Request $request, Jar $jar): void
    {
        if ($jar->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized');
        }
    }

    private function authorizeBudgetJar(Request $request, Jar $jar): void
    {
        if ($jar->user_id !== $request->user()->id || $jar->wallet_type !== Jar::TYPE_BUDGET) {
            abort(403, 'Unauthorized');
        }
    }
}
