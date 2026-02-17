<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Jar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            return response()->json(['message' => 'Expense exceeds jar balance'], 422);
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
            'category' => 'sometimes|nullable|string|max:255',
            'note' => 'sometimes|nullable|string',
            'spent_at' => 'sometimes|nullable|date',
        ]);

        $expense->update($data);

        return response()->json($expense);
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
