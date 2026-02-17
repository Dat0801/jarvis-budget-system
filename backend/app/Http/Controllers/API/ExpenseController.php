<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Jar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
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
}
