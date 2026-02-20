<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Income;
use App\Models\Jar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IncomeController extends Controller
{
    public function index(Request $request)
    {
        $incomes = Income::where('user_id', $request->user()->id)
            ->with('jar')
            ->orderBy('received_at', 'desc')
            ->paginate(20);

        return response()->json($incomes);
    }

    public function show(Request $request, Income $income)
    {
        $this->authorize($request, $income);

        return response()->json($income->load('jar'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'jar_id' => 'nullable|integer|exists:jars,id',
            'amount' => 'required|numeric|min:0.01',
            'category' => 'required|nullable|string|max:255',
            'source' => 'nullable|string|max:255',
            'received_at' => 'nullable|date',
        ]);

        $walletId = $this->resolveWalletId($request, $data['jar_id'] ?? null);

        $income = DB::transaction(function () use ($request, $data, $walletId) {
            $income = Income::create([
                'user_id' => $request->user()->id,
                'jar_id' => $walletId,
                'amount' => $data['amount'],
                'category' => $data['category'],
                'source' => $data['source'] ?? null,
                'received_at' => $data['received_at'] ?? null,
            ]);

            $jar = Jar::query()
                ->where('id', $walletId)
                ->where('user_id', $request->user()->id)
                ->where('wallet_type', Jar::TYPE_WALLET)
                ->lockForUpdate()
                ->firstOrFail();

            $jar->update([
                'balance' => $jar->balance + $data['amount'],
            ]);

            return $income;
        });

        return response()->json($income, 201);
    }

    public function update(Request $request, Income $income)
    {
        $this->authorize($request, $income);

        $data = $request->validate([
            'jar_id' => 'sometimes|nullable|integer|exists:jars,id',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'category' => 'sometimes|nullable|string|max:255',
            'source' => 'sometimes|nullable|string|max:255',
            'received_at' => 'sometimes|nullable|date',
        ]);

        $updatedIncome = DB::transaction(function () use ($request, $income, $data) {
            $newJarId = $data['jar_id'] ?? $income->jar_id;
            $newAmount = (float) ($data['amount'] ?? $income->amount);
            $oldJarId = $income->jar_id;

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
                        'balance' => ($oldJar->balance - $income->amount) + $newAmount,
                    ]);
                } else {
                    $oldJar->update([
                        'balance' => $oldJar->balance - $income->amount,
                    ]);

                    $newJar->update([
                        'balance' => $newJar->balance + $newAmount,
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
                    'balance' => $oldJar->balance - $income->amount,
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
                    'balance' => $newJar->balance + $newAmount,
                ]);
            }

            $income->update($data);

            return $income->fresh();
        });

        return response()->json($updatedIncome);
    }

    public function destroy(Request $request, Income $income)
    {
        $this->authorize($request, $income);

        DB::transaction(function () use ($income) {
            if ($income->jar_id !== null) {
                $jar = $income->jar;
                $jar->update([
                    'balance' => $jar->balance - $income->amount,
                ]);
            }
            $income->delete();
        });

        return response()->json(['message' => 'Income deleted']);
    }

    private function authorize(Request $request, Income $income): void
    {
        if ($income->user_id !== $request->user()->id) {
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
