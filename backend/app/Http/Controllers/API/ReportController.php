<?php

namespace App\Http\Controllers\API;

use App\Exports\TransactionsExport;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function export(Request $request)
    {
        $request->validate([
            'months' => 'required|array',
            'months.*' => 'required|date_format:Y-m',
        ]);

        $months = $request->months;
        $userId = $request->user()->id;

        $fileName = 'transactions_report_' . Carbon::now()->format('Ymd_His') . '.xlsx';

        return Excel::download(new TransactionsExport($months, $userId), $fileName);
    }
}
