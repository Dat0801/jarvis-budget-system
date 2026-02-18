<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    public function resetData(Request $request)
    {
        $user = $request->user();

        DB::transaction(function () use ($user) {
            $user->monthlyReports()->delete();
            $user->notes()->delete();
            $user->incomes()->delete();
            $user->expenses()->delete();
            $user->jars()->delete();
        });

        return response()->json(['message' => 'Account financial data reset successfully']);
    }
}
