<?php

namespace App\Exports;

use App\Models\Expense;
use App\Models\Income;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithMapping;
use Carbon\Carbon;

class MonthTransactionsSheet implements FromCollection, WithTitle, WithHeadings, WithMapping
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
                $item->type = 'Expense';
                $item->date = $item->spent_at;
                return $item;
            });

        $incomes = Income::where('user_id', $this->userId)
            ->whereYear('received_at', $year)
            ->whereMonth('received_at', $month)
            ->with('jar')
            ->get()
            ->map(function ($item) {
                $item->type = 'Income';
                $item->date = $item->received_at;
                return $item;
            });

        return $expenses->concat($incomes)->sortBy('date');
    }

    public function title(): string
    {
        return Carbon::parse($this->month)->format('M Y');
    }

    public function headings(): array
    {
        return [
            'Date',
            'Type',
            'Category',
            'Amount',
            'Wallet/Jar',
            'Note/Source',
        ];
    }

    public function map($transaction): array
    {
        return [
            $transaction->date->format('Y-m-d'),
            $transaction->type,
            $transaction->category,
            $transaction->amount,
            $transaction->jar ? $transaction->jar->name : 'N/A',
            $transaction->type === 'Expense' ? $transaction->note : $transaction->source,
        ];
    }
}
