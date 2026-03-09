<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Carbon\Carbon;

class TransactionsExport implements WithMultipleSheets
{
    private $months;
    private $userId;

    public function __construct(array $months, int $userId)
    {
        $this->months = $months;
        $this->userId = $userId;
    }

    /**
     * @return array
     */
    public function sheets(): array
    {
        $sheets = [];

        foreach ($this->months as $month) {
            $sheets[] = new MonthTransactionsSheet($month, $this->userId);
        }

        return $sheets;
    }
}
