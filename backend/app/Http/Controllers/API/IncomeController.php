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
            'category' => 'required_without:jar_id|nullable|string|max:255',
            'source' => 'nullable|string|max:255',
            'received_at' => 'nullable|date',
        ]);

        $jar = $this->resolveJarForIncome($request, $data);

        $income = DB::transaction(function () use ($request, $data, $jar) {
            $income = Income::create([
                'user_id' => $request->user()->id,
                'jar_id' => $jar->id,
                'amount' => $data['amount'],
                'category' => $data['category'] ?? $jar->category ?? $jar->name,
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
            'category' => 'sometimes|nullable|string|max:255',
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

    private function resolveJarForIncome(Request $request, array $data): Jar
    {
        if (!empty($data['jar_id'])) {
            return Jar::query()
                ->where('id', $data['jar_id'])
                ->where('user_id', $request->user()->id)
                ->firstOrFail();
        }

        $category = mb_strtolower(trim((string) ($data['category'] ?? '')));

        if ($category === '') {
            abort(422, 'Category is required for income');
        }

        $jar = Jar::query()
            ->where('user_id', $request->user()->id)
            ->where(function ($query) use ($category) {
                $query
                    ->whereRaw("LOWER(COALESCE(category, '')) = ?", [$category])
                    ->orWhereRaw('LOWER(name) = ?', [$category]);
            })
            ->first();

        if (!$jar) {
            $jar = Jar::create([
                'user_id' => $request->user()->id,
                'name' => $data['category'],
                'category' => $data['category'],
                'balance' => 0,
            ]);
        }

        return $jar;
    }
}
