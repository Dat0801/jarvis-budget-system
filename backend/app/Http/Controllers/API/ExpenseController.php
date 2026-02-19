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
            'category' => 'required_without:jar_id|nullable|string|max:255',
            'note' => 'nullable|string',
            'spent_at' => 'nullable|date',
        ]);

        $jar = $this->resolveJarForExpense($request, $data);

        $expense = DB::transaction(function () use ($request, $data, $jar) {
            $expense = Expense::create([
                'user_id' => $request->user()->id,
                'jar_id' => $jar->id,
                'amount' => $data['amount'],
                'category' => $data['category'] ?? $jar->category ?? $jar->name,
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

            $oldJar = Jar::query()
                ->where('id', $expense->jar_id)
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->firstOrFail();

            $newJar = Jar::query()
                ->where('id', $newJarId)
                ->where('user_id', $request->user()->id)
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

    private function resolveJarForExpense(Request $request, array $data): Jar
    {
        if (!empty($data['jar_id'])) {
            return Jar::query()
                ->where('id', $data['jar_id'])
                ->where('user_id', $request->user()->id)
                ->firstOrFail();
        }

        $category = mb_strtolower(trim((string) ($data['category'] ?? '')));

        $jar = Jar::query()
            ->where('user_id', $request->user()->id)
            ->where(function ($query) use ($category) {
                $query
                    ->whereRaw("LOWER(COALESCE(category, '')) = ?", [$category])
                    ->orWhereRaw('LOWER(name) = ?', [$category]);
            })
            ->first();

        if (!$jar) {
            throw ValidationException::withMessages([
                'category' => ['No budget found for selected category'],
            ]);
        }

        return $jar;
    }
}
