<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Income;
use App\Models\Jar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IncomeController extends Controller
{
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
}
