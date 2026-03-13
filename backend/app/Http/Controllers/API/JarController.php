<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Income;
use App\Models\Jar;
use App\Models\TransactionCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JarController extends Controller
{
    public function index(Request $request)
    {
        $jars = $request->user()
            ->jars()
            ->where('wallet_type', Jar::TYPE_BUDGET)
            ->latest()
            ->get();

        foreach ($jars as $jar) {
            $jar->spent = $this->calculateJarSpent($jar);
        }

        return response()->json($jars);
    }

    public function show(Request $request, Jar $jar)
    {
        $this->authorizeJarAccess($request, $jar);
        $jar->spent = $this->calculateJarSpent($jar);

        return response()->json($jar);
    }

    private function calculateJarSpent(Jar $jar): float
    {
        $expenseQuery = Expense::query()->where('user_id', $jar->user_id);

        if ($jar->wallet_type === Jar::TYPE_BUDGET) {
            $categoryNames = [$jar->category ?: $jar->name];

            // Resolve all linked categories and their descendants
            $linkedCategories = $jar->categories()->with('children')->get();
            if ($linkedCategories->isNotEmpty()) {
                foreach ($linkedCategories as $cat) {
                    $categoryNames = array_merge($categoryNames, $cat->getAllDescendantNames());
                }
            } else {
                // If no direct link in category_jar, try to find a category by name
                $matchingCat = TransactionCategory::where('name', $jar->category ?: $jar->name)->first();
                if ($matchingCat) {
                    $categoryNames = array_merge($categoryNames, $matchingCat->getAllDescendantNames());
                }
            }
            $categoryNames = array_unique(array_filter($categoryNames));

            $expenseQuery->where(function ($q) use ($jar, $categoryNames) {
                $q->where('jar_id', $jar->id)
                  ->orWhereIn('category', $categoryNames);
            });
        } else {
            $expenseQuery->where('jar_id', $jar->id);
        }

        return (float) $expenseQuery->sum('amount');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:255|required_without:category',
            'category' => 'nullable|string|max:255|required_without:name',
            'icon' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'balance' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
            'currency_unit' => 'nullable|string|max:10',
            'budget_date' => 'nullable|date',
            'repeat_this_budget' => 'sometimes|boolean',
            'wallet_id' => 'nullable|exists:jars,id',
        ]);

        $resolvedName = $data['name'] ?? $data['category'];
        $resolvedBalance = $data['amount'] ?? ($data['balance'] ?? 0);

        $jar = $request->user()->jars()->create([
            'name' => $resolvedName,
            'category' => $data['category'] ?? $resolvedName,
            'icon' => $data['icon'] ?? 'basket-outline',
            'description' => $data['description'] ?? null,
            'balance' => $resolvedBalance,
            'budget_date' => $data['budget_date'] ?? null,
            'repeat_this_budget' => $data['repeat_this_budget'] ?? false,
            'wallet_type' => Jar::TYPE_BUDGET,
            'currency_unit' => $data['currency_unit'] ?? 'VND',
            'notifications_enabled' => false,
            'wallet_id' => $data['wallet_id'] ?? null,
        ]);

        return response()->json($jar, 201);
    }

    public function update(Request $request, Jar $jar)
    {
        $this->authorizeBudgetJar($request, $jar);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|nullable|string|max:255',
            'icon' => 'sometimes|nullable|string|max:255',
            'description' => 'nullable|string',
            'balance' => 'sometimes|numeric|min:0',
            'amount' => 'sometimes|numeric|min:0',
            'currency_unit' => 'sometimes|nullable|string|max:10',
            'budget_date' => 'sometimes|nullable|date',
            'repeat_this_budget' => 'sometimes|boolean',
            'wallet_id' => 'sometimes|nullable|exists:jars,id',
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

    public function merge(Request $request)
    {
        $data = $request->validate([
            'source_jar_ids' => 'required|array|min:1',
            'source_jar_ids.*' => 'exists:jars,id',
            'target_jar_id' => 'nullable|exists:jars,id',
            'new_jar_name' => 'required_without:target_jar_id|string|max:255',
            'category_id' => 'nullable|exists:transaction_categories,id',
        ]);

        $user = $request->user();
        $sourceJars = Jar::whereIn('id', $data['source_jar_ids'])
            ->where('user_id', $user->id)
            ->where('wallet_type', Jar::TYPE_BUDGET)
            ->get();

        if ($sourceJars->count() !== count($data['source_jar_ids'])) {
            abort(403, 'Unauthorized access to some source jars');
        }

        $totalBalance = $sourceJars->sum('balance');

        return DB::transaction(function () use ($user, $data, $sourceJars, $totalBalance) {
            if (!empty($data['target_jar_id'])) {
                $targetJar = Jar::where('id', $data['target_jar_id'])
                    ->where('user_id', $user->id)
                    ->where('wallet_type', Jar::TYPE_BUDGET)
                    ->firstOrFail();
                
                $targetJar->update([
                    'balance' => $targetJar->balance + $totalBalance,
                ]);
            } else {
                $targetJar = $user->jars()->create([
                    'name' => $data['new_jar_name'],
                    'category' => $data['new_jar_name'],
                    'balance' => $totalBalance,
                    'wallet_type' => Jar::TYPE_BUDGET,
                    'icon' => 'basket-outline',
                    'currency_unit' => 'VND',
                ]);
            }

            if (!empty($data['category_id'])) {
                $targetJar->categories()->syncWithoutDetaching([$data['category_id']]);
            }

            // Transfer expenses/incomes and update their categories to the target jar's category
            $targetCategory = $targetJar->category ?: $targetJar->name;
            foreach ($sourceJars as $sourceJar) {
                $sourceCategory = $sourceJar->category ?: $sourceJar->name;
                
                // Update expenses that were linked by jar_id
                Expense::where('jar_id', $sourceJar->id)->update([
                    'jar_id' => $targetJar->id,
                    'category' => $targetCategory
                ]);
                
                // Update expenses that were linked by category name
                if ($sourceCategory) {
                    Expense::where('user_id', $user->id)
                        ->where('category', $sourceCategory)
                        ->update(['category' => $targetCategory]);
                }

                // Update incomes that were linked by jar_id
                Income::where('jar_id', $sourceJar->id)->update([
                    'jar_id' => $targetJar->id,
                    'category' => $targetCategory
                ]);

                // Update incomes that were linked by category name
                if ($sourceCategory) {
                    Income::where('user_id', $user->id)
                        ->where('category', $sourceCategory)
                        ->update(['category' => $targetCategory]);
                }

                $sourceJar->delete();
            }

            return response()->json($targetJar->load('categories'));
        });
    }

    public function getTransactions(Request $request, Jar $jar)
    {
        $this->authorizeJarAccess($request, $jar);

        $page = max((int) $request->query('page', 1), 1);
        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);

        $expenseQuery = Expense::query()->where('user_id', $request->user()->id);
        $incomeQuery = Income::query()->where('user_id', $request->user()->id);

        if ($jar->wallet_type === Jar::TYPE_BUDGET) {
            $categoryNames = [$jar->category ?: $jar->name];

            // Resolve all linked categories and their descendants
            $linkedCategories = $jar->categories()->with('children')->get();
            if ($linkedCategories->isNotEmpty()) {
                foreach ($linkedCategories as $cat) {
                    $categoryNames = array_merge($categoryNames, $cat->getAllDescendantNames());
                }
            } else {
                // If no direct link in category_jar, try to find a category by name
                $matchingCat = TransactionCategory::where('name', $jar->category ?: $jar->name)->first();
                if ($matchingCat) {
                    $categoryNames = array_merge($categoryNames, $matchingCat->getAllDescendantNames());
                }
            }
            $categoryNames = array_unique(array_filter($categoryNames));

            $expenseQuery->where(function ($q) use ($jar, $categoryNames) {
                $q->where('jar_id', $jar->id)
                  ->orWhereIn('category', $categoryNames);
            });

            $incomeQuery->where(function ($q) use ($jar, $categoryNames) {
                $q->where('jar_id', $jar->id)
                  ->orWhereIn('category', $categoryNames);
            });
        } else {
            $expenseQuery->where('jar_id', $jar->id);
            $incomeQuery->where('jar_id', $jar->id);
        }

        $expenseQuery->selectRaw("id, 'expense' as type, amount, category, note, null as source, spent_at as date, created_at");
        $incomeQuery->selectRaw("id, 'income' as type, amount, category, null as note, source, received_at as date, created_at");

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
