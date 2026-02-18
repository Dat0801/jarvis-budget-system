<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\TransactionCategory;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function tree(Request $request)
    {
        $data = $request->validate([
            'type' => 'nullable|in:expense,income,debt_loan',
        ]);

        $query = TransactionCategory::query()
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->with([
                'children' => function ($childQuery) {
                    $childQuery
                        ->where('is_active', true)
                        ->orderBy('sort_order')
                        ->orderBy('name');
                },
            ]);

        if (!empty($data['type'])) {
            $query->where('type', $data['type']);
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }
}
