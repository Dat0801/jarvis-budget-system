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
                'jars',
                'children' => function ($childQuery) {
                    $childQuery
                        ->where('is_active', true)
                        ->orderBy('sort_order')
                        ->orderBy('name')
                        ->with('jars');
                },
            ]);

        if (!empty($data['type'])) {
            $query->where('type', $data['type']);
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:expense,income,debt_loan',
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:255',
            'parent_id' => 'nullable|exists:transaction_categories,id',
            'jar_ids' => 'nullable|array',
            'jar_ids.*' => 'exists:jars,id',
        ]);

        $category = TransactionCategory::create([
            'type' => $data['type'],
            'name' => $data['name'],
            'icon' => $data['icon'] ?? null,
            'parent_id' => $data['parent_id'] ?? null,
        ]);

        if (!empty($data['jar_ids'])) {
            $category->jars()->sync($data['jar_ids']);
        }

        return response()->json($category->load('jars'));
    }

    public function update(Request $request, TransactionCategory $category)
    {
        $data = $request->validate([
            'type' => 'sometimes|required|in:expense,income,debt_loan',
            'name' => 'sometimes|required|string|max:255',
            'icon' => 'nullable|string|max:255',
            'parent_id' => 'nullable|exists:transaction_categories,id',
            'jar_ids' => 'nullable|array',
            'jar_ids.*' => 'exists:jars,id',
            'is_active' => 'sometimes|boolean',
        ]);

        $category->update($data);

        if (isset($data['jar_ids'])) {
            $category->jars()->sync($data['jar_ids']);
        }

        return response()->json($category->load('jars'));
    }

    public function destroy(TransactionCategory $category)
    {
        $category->delete();
        return response()->json(['message' => 'Category deleted']);
    }
}
