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
            'jar_id' => 'required|integer|exists:jars,id',
            'amount' => 'required|numeric|min:0.01',
            'category' => 'nullable|string|max:255',
            'note' => 'nullable|string',
            'spent_at' => 'nullable|date',
        ]);

        $jar = Jar::query()
            ->where('id', $data['jar_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($data['amount'] > $jar->balance) {
            return response()->json(['message' => 'Expense exceeds budget balance'], 422);
        }

        $expense = DB::transaction(function () use ($request, $data, $jar) {
            $expense = Expense::create([
                'user_id' => $request->user()->id,
                'jar_id' => $jar->id,
                'amount' => $data['amount'],
                'category' => $data['category'] ?? null,
                'note' => $data['note'] ?? null,
                'spent_at' => $data['spent_at'] ?? null,
            ]);

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
            'jar_id' => 'sometimes|required|integer|exists:jars,id',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'category' => 'sometimes|nullable|string|max:255',
            'note' => 'sometimes|nullable|string',
            'spent_at' => 'sometimes|nullable|date',
        ]);

        $updatedExpense = DB::transaction(function () use ($request, $expense, $data) {
            $newJarId = (int) ($data['jar_id'] ?? $expense->jar_id);
            $newAmount = (float) ($data['amount'] ?? $expense->amount);

            $newJar = Jar::query()
                ->where('id', $newJarId)
                ->where('user_id', $request->user()->id)
                ->firstOrFail();

            $oldJar = Jar::query()->lockForUpdate()->findOrFail($expense->jar_id);
            $newJar = Jar::query()->lockForUpdate()->findOrFail($newJarId);

            if ($oldJar->id === $newJar->id) {
                $available = $oldJar->balance + $expense->amount;
                if ($newAmount > $available) {
                    throw ValidationException::withMessages([
                        'amount' => ['Expense exceeds budget balance'],
                    ]);
                }

                $oldJar->update([
                    'balance' => $available - $newAmount,
                ]);
            } else {
                if ($newAmount > $newJar->balance) {
                    throw ValidationException::withMessages([
                        'amount' => ['Expense exceeds budget balance'],
                    ]);
                }

                $oldJar->update([
                    'balance' => $oldJar->balance + $expense->amount,
                ]);

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

        $jar = $expense->jar;
        
        DB::transaction(function () use ($expense, $jar) {
            $jar->update([
                'balance' => $jar->balance + $expense->amount,
            ]);
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
}
