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
            'jar_id' => 'required|integer|exists:jars,id',
            'amount' => 'required|numeric|min:0.01',
            'source' => 'nullable|string|max:255',
            'received_at' => 'nullable|date',
        ]);

        $jar = Jar::query()
            ->where('id', $data['jar_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $income = DB::transaction(function () use ($request, $data, $jar) {
            $income = Income::create([
                'user_id' => $request->user()->id,
                'jar_id' => $jar->id,
                'amount' => $data['amount'],
                'source' => $data['source'] ?? null,
                'received_at' => $data['received_at'] ?? null,
            ]);

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
            'source' => 'sometimes|nullable|string|max:255',
            'received_at' => 'sometimes|nullable|date',
        ]);

        $income->update($data);

        return response()->json($income);
    }

    public function destroy(Request $request, Income $income)
    {
        $this->authorize($request, $income);

        $jar = $income->jar;
        
        DB::transaction(function () use ($income, $jar) {
            $jar->update([
                'balance' => $jar->balance - $income->amount,
            ]);
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
}
