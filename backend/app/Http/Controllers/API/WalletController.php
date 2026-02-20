<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Jar;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function index(Request $request)
    {
        $this->ensureDefaultCashWallet($request);

        return response()->json(
            $request->user()
                ->jars()
                ->where('wallet_type', Jar::TYPE_WALLET)
                ->orderBy('created_at')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $this->ensureDefaultCashWallet($request);

        $data = $request->validate([
            'wallet_type' => 'required|string|in:basic',
            'name' => 'required|string|max:255',
            'currency_unit' => 'required|string|max:10',
            'initial_balance' => 'nullable|numeric|min:0',
            'notifications_enabled' => 'sometimes|boolean',
        ]);

        $wallet = $request->user()->jars()->create([
            'name' => $data['name'],
            'category' => null,
            'description' => null,
            'balance' => $data['initial_balance'] ?? 0,
            'budget_date' => null,
            'repeat_this_budget' => false,
            'wallet_type' => Jar::TYPE_WALLET,
            'currency_unit' => strtoupper($data['currency_unit']),
            'notifications_enabled' => $data['notifications_enabled'] ?? false,
        ]);

        return response()->json($wallet, 201);
    }

    private function ensureDefaultCashWallet(Request $request): void
    {
        $request->user()->jars()->firstOrCreate(
            [
                'wallet_type' => Jar::TYPE_WALLET,
                'name' => 'Cash',
            ],
            [
                'category' => null,
                'description' => null,
                'balance' => 0,
                'budget_date' => null,
                'repeat_this_budget' => false,
                'currency_unit' => 'VND',
                'notifications_enabled' => false,
            ]
        );
    }
}
