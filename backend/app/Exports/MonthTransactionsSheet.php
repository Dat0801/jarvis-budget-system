<?php

namespace App\Exports;

use App\Models\Expense;
use App\Models\Income;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Carbon\Carbon;

class MonthTransactionsSheet implements FromCollection, WithTitle, WithStyles, ShouldAutoSize
{
    private $month;
    private $userId;

    public function __construct(string $month, int $userId)
    {
        $this->month = $month;
        $this->userId = $userId;
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        $date = Carbon::parse($this->month);
        $year = $date->year;
        $month = $date->month;

        $expenses = Expense::where('user_id', $this->userId)
            ->whereYear('spent_at', $year)
            ->whereMonth('spent_at', $month)
            ->with('jar')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'date' => $item->spent_at->format('Y-m-d'),
                    'type' => 'Expense',
                    'category' => $item->category,
                    'amount' => $item->amount,
                    'jar' => $item->jar ? $item->jar->name : 'N/A',
                    'note' => $item->note,
                    'sort_date' => $item->spent_at
                ];
            });

        $incomes = Income::where('user_id', $this->userId)
            ->whereYear('received_at', $year)
            ->whereMonth('received_at', $month)
            ->with('jar')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'date' => $item->received_at->format('Y-m-d'),
                    'type' => 'Income',
                    'category' => $item->category,
                    'amount' => $item->amount,
                    'jar' => $item->jar ? $item->jar->name : 'N/A',
                    'note' => $item->source,
                    'sort_date' => $item->received_at
                ];
            });

        // Use unique to prevent duplicates based on type and id
        $transactions = $expenses->concat($incomes)
            ->unique(function ($item) {
                return $item['type'] . '-' . $item['id'];
            })
            ->sortBy('sort_date');

        // Calculate totals
        $totalIncome = $incomes->sum('amount');
        $totalExpense = $expenses->sum('amount');
        $balance = $totalIncome - $totalExpense;

        // Build the collection for display
        $data = collect();

        // Summary Information at the top
        $data->push(['STATISTICS FOR ' . $date->format('F Y')]);
        $data->push(['Total Income:', '', '', number_format($totalIncome, 0, ',', '.') . ' VND']);
        $data->push(['Total Expenses:', '', '', number_format($totalExpense, 0, ',', '.') . ' VND']);
        $data->push(['Balance:', '', '', number_format($balance, 0, ',', '.') . ' VND']);
        $data->push(['']); // Empty row

        // Headings for the transaction list
        $data->push([
            'Date',
            'Type',
            'Category',
            'Amount',
            'Wallet/Jar',
            'Note/Source',
        ]);

        // Transactions
        foreach ($transactions as $t) {
            $data->push([
                $t['date'],
                $t['type'],
                $t['category'],
                number_format($t['amount'], 0, ',', '.') . ' VND',
                $t['jar'],
                $t['note'],
            ]);
        }

        // Total row at the bottom
        $data->push(['']);
        $data->push([
            'TOTAL',
            '',
            '',
            number_format($totalIncome - $totalExpense, 0, ',', '.') . ' VND (Balance)',
            '',
            '',
        ]);

        return $data;
    }

    public function title(): string
    {
        return $date = Carbon::parse($this->month)->format('M Y');
    }

    public function styles(Worksheet $sheet)
    {
        return [
            // Style the summary rows
            1 => ['font' => ['bold' => true, 'size' => 14]],
            2 => ['font' => ['bold' => true]],
            3 => ['font' => ['bold' => true]],
            4 => ['font' => ['bold' => true]],
            
            // Style the transaction headings row (row 6 because of 4 summary rows + 1 empty row)
            6 => ['font' => ['bold' => true], 'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'E2E8F0']]],
        ];
    }
}
