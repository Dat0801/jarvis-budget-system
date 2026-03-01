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
                ->withCount('categories')
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
            'icon' => 'nullable|string|max:255',
            'currency_unit' => 'required|string|max:10',
            'initial_balance' => 'nullable|numeric|min:0',
            'notifications_enabled' => 'sometimes|boolean',
        ]);

        $wallet = $request->user()->jars()->create([
            'name' => $data['name'],
            'icon' => $data['icon'] ?? 'wallet-outline',
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

    public function update(Request $request, $id)
    {
        $wallet = $request->user()->jars()->where('wallet_type', Jar::TYPE_WALLET)->findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'icon' => 'sometimes|string|max:255',
            'currency_unit' => 'sometimes|string|max:10',
            'balance' => 'sometimes|numeric|min:0',
            'notifications_enabled' => 'sometimes|boolean',
        ]);

        if (isset($data['currency_unit'])) {
            $data['currency_unit'] = strtoupper($data['currency_unit']);
        }

        $wallet->update($data);

        return response()->json($wallet);
    }

    public function destroy(Request $request, $id)
    {
        $wallet = $request->user()->jars()->where('wallet_type', Jar::TYPE_WALLET)->findOrFail($id);

        // Optional: Check if it's the default wallet and prevent deletion if necessary
        // if ($wallet->name === 'Cash') {
        //     return response()->json(['message' => 'Cannot delete default wallet'], 400);
        // }

        $wallet->delete();

        return response()->json(['message' => 'Wallet deleted successfully']);
    }

    public function categories(Request $request, $id)
    {
        $wallet = $request->user()->jars()->where('wallet_type', Jar::TYPE_WALLET)->findOrFail($id);
        
        return response()->json($wallet->categories);
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
