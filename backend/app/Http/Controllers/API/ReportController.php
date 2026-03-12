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

        // Create filename based on selected months
        if (count($months) === 1) {
            $fileName = 'Monthly_Report_' . Carbon::parse($months[0])->format('m_Y') . '.xlsx';
        } else {
            $fileName = 'Consolidated_Report_' . Carbon::now()->format('m_Y') . '.xlsx';
        }

        return Excel::download(new TransactionsExport($months, $userId), $fileName);
    }
}
