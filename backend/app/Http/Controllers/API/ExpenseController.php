<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Jar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $expenses = Expense::where('user_id', $request->user()->id)
            ->with('jar')
            ->orderBy('spent_at', 'desc')
            ->paginate(20);

        return response()->json($expenses);
    }

    public function show(Request $request, Expense $expense)
    {
        $this->authorize($request, $expense);

        return response()->json($expense->load('jar'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'jar_id' => 'nullable|integer|exists:jars,id',
            'amount' => 'required|numeric|min:0.01',
            'category' => 'required|nullable|string|max:255',
            'note' => 'nullable|string',
            'spent_at' => 'nullable|date',
        ]);

        $walletId = $this->resolveWalletId($request, $data['jar_id'] ?? null);

        $expense = DB::transaction(function () use ($request, $data, $walletId) {
            $expense = Expense::create([
                'user_id' => $request->user()->id,
                'jar_id' => $walletId,
                'amount' => $data['amount'],
                'category' => $data['category'],
                'note' => $data['note'] ?? null,
                'spent_at' => $data['spent_at'] ?? null,
            ]);

            $jar = Jar::query()
                ->where('id', $walletId)
                ->where('user_id', $request->user()->id)
                ->where('wallet_type', Jar::TYPE_WALLET)
                ->lockForUpdate()
                ->firstOrFail();

            $jar->update([
                'balance' => $jar->balance - $data['amount'],
            ]);

            return $expense;
        });

        return response()->json($expense, 201);
    }

    public function update(Request $request, Expense $expense)
    {
        $this->authorize($request, $expense);

        $data = $request->validate([
            'jar_id' => 'sometimes|nullable|integer|exists:jars,id',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'category' => 'sometimes|nullable|string|max:255',
            'note' => 'sometimes|nullable|string',
            'spent_at' => 'sometimes|nullable|date',
        ]);

        $updatedExpense = DB::transaction(function () use ($request, $expense, $data) {
            $newJarId = $data['jar_id'] ?? $expense->jar_id;
            $newAmount = (float) ($data['amount'] ?? $expense->amount);
            $oldJarId = $expense->jar_id;

            // Handle jar balance updates if jar_id changes or amount changes
            if ($oldJarId !== null && $newJarId !== null) {
                $oldJar = Jar::query()
                    ->where('id', $oldJarId)
                    ->where('user_id', $request->user()->id)
                    ->where('wallet_type', Jar::TYPE_WALLET)
                    ->lockForUpdate()
                    ->firstOrFail();

                $newJar = Jar::query()
                    ->where('id', $newJarId)
                    ->where('user_id', $request->user()->id)
                    ->where('wallet_type', Jar::TYPE_WALLET)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($oldJar->id === $newJar->id) {
                    $oldJar->update([
                        'balance' => ($oldJar->balance + $expense->amount) - $newAmount,
                    ]);
                } else {
                    $oldJar->update([
                        'balance' => $oldJar->balance + $expense->amount,
                    ]);

                    $newJar->update([
                        'balance' => $newJar->balance - $newAmount,
                    ]);
                }
            } elseif ($oldJarId !== null && $newJarId === null) {
                // Moving from budget to no budget
                $oldJar = Jar::query()
                    ->where('id', $oldJarId)
                    ->where('user_id', $request->user()->id)
                    ->where('wallet_type', Jar::TYPE_WALLET)
                    ->lockForUpdate()
                    ->firstOrFail();

                $oldJar->update([
                    'balance' => $oldJar->balance + $expense->amount,
                ]);
            } elseif ($oldJarId === null && $newJarId !== null) {
                // Moving from no budget to budget
                $newJar = Jar::query()
                    ->where('id', $newJarId)
                    ->where('user_id', $request->user()->id)
                    ->where('wallet_type', Jar::TYPE_WALLET)
                    ->lockForUpdate()
                    ->firstOrFail();

                $newJar->update([
                    'balance' => $newJar->balance - $newAmount,
                ]);
            }

            $expense->update($data);

            return $expense->fresh();
        });

        return response()->json($updatedExpense);
    }

    public function destroy(Request $request, Expense $expense)
    {
        $this->authorize($request, $expense);

        DB::transaction(function () use ($expense) {
            if ($expense->jar_id !== null) {
                $jar = $expense->jar;
                $jar->update([
                    'balance' => $jar->balance + $expense->amount,
                ]);
            }
            $expense->delete();
        });

        return response()->json(['message' => 'Expense deleted']);
    }

    private function authorize(Request $request, Expense $expense): void
    {
        if ($expense->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized');
        }
    }

    private function resolveWalletId(Request $request, ?int $walletId): int
    {
        if ($walletId) {
            return $walletId;
        }

        $cashWallet = Jar::query()
            ->where('user_id', $request->user()->id)
            ->where('wallet_type', Jar::TYPE_WALLET)
            ->where('name', 'Cash')
            ->first();

        if ($cashWallet) {
            return $cashWallet->id;
        }

        $wallet = $request->user()->jars()->create([
            'name' => 'Cash',
            'category' => null,
            'description' => null,
            'balance' => 0,
            'budget_date' => null,
            'repeat_this_budget' => false,
            'wallet_type' => Jar::TYPE_WALLET,
            'currency_unit' => 'VND',
            'notifications_enabled' => false,
        ]);

        return $wallet->id;
    }
}
